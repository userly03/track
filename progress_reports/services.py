from django.db.models import Sum
from django.utils import timezone

from purchases.models import Purchase
from deliveries.models import Delivery
from alerts.services import (
    check_progress_consistency,
    check_expected_progress as alerts_check_expected_progress,
    check_data_manipulation,
)
from trackbuild.utils.hashing import generate_sha256_hash

# 🟢 Auditoría History
from history.services import log_action


# ============================================================
# 🟩 HASHING PROFESIONAL — integridad inmutable
# ============================================================


def generate_progress_hash(progress_report):
    payload = {
        "id": progress_report.id,
        "project": progress_report.project_id,
        "description": progress_report.description,
        "percentage": float(progress_report.percentage),
        "date": str(progress_report.date),
        "status": progress_report.status,
        "metadata": progress_report.metadata,
        "previous_hash": progress_report.previous_hash,
    }
    return generate_sha256_hash(payload)


def update_progress_hash(progress_report):
    """
    Recalcula y actualiza el hash del ProgressReport.
    Incluye auditoría.
    """

    # 🟡 BEFORE
    before = progress_report.__class__.objects.get(id=progress_report.id)

    # Evitar que el post_save vuelva a activar el signal
    setattr(progress_report, "_disable_signals", True)

    progress_report.content_hash = generate_progress_hash(progress_report)
    progress_report.save(update_fields=["content_hash"])

    # Limpiar flag
    setattr(progress_report, "_disable_signals", False)

    # 🟢 HISTORY
    log_action(
        action_type="progress_hash_updated",
        user=getattr(progress_report, "_current_user", None),
        instance_before=before,
        instance_after=progress_report,
        project=progress_report.project,
        metadata={"new_hash": progress_report.content_hash},
    )

    return progress_report.content_hash


# ============================================================
# 🟦 COHERENCIA + ALERTAS COMPLEJAS
# ============================================================


def evaluate_progress_for_alerts(progress_report):
    """
    Evalúa TODAS las alertas del módulo de Progress Reports.
    """

    # 🟡 BEFORE
    before = progress_report.__class__.objects.get(id=progress_report.id)

    # 1. Coherencia materiales
    check_progress_consistency(progress_report)

    # 2. Avance retrasado vs línea base
    alerts_check_expected_progress(progress_report.project)

    # 3. Manipulación del registro
    check_data_manipulation(progress_report)

    # 🟢 HISTORY
    log_action(
        action_type="progress_alerts_evaluated",
        user=getattr(progress_report, "_current_user", None),
        instance_before=before,
        instance_after=progress_report,
        project=progress_report.project,
        metadata={"alert_engine": "material_consistency + baseline_check + integrity"},
    )


# ============================================================
# Mantener compatibilidad
# ============================================================


def generate_alerts_for_progress(progress_report):
    info = {
        "delivered": 0,
        "required": float(progress_report.percentage),
        "coherent": True,
    }
    return [
        {
            "type": "diagnostic",
            "message": "Compatibilidad garantizada para módulos antiguos.",
        }
    ]


from history.services import log_action, record_field_changes


def update_progress_report(instance, data, user=None, reason=None):
    """
    Actualización PRO de ProgressReport con auditoría avanzada.
    - Captura BEFORE
    - Actualiza campos
    - Captura AFTER
    - ChangeRecord por cada campo cambiado
    - HistoryRecord del evento
    """

    # BEFORE
    before = instance.__class__.objects.get(pk=instance.pk)

    # Aplicar cambios dinámicos
    for field, value in data.items():
        setattr(instance, field, value)

    instance.save()

    # AFTER
    after = instance.__class__.objects.get(pk=instance.pk)

    # Auditoría detallada campo por campo
    record_field_changes(
        instance_before=before,
        instance_after=after,
        user=user,
        reason=reason,
    )

    # Auditoría general del evento
    log_action(
        action_type="progress_report_updated",
        user=user,
        instance_before=before,
        instance_after=after,
        project=getattr(instance, "project", None),
        metadata={"reason": reason} if reason else {},
    )

    return instance
