from decimal import Decimal
from django.db.models import Sum

from .models import Delivery
from purchases.models import Purchase
from trackbuild.utils.hashing import generate_sha256_hash

# NUEVO SISTEMA DE ALERTAS
from alerts.services import (
    check_delivery_balance as alerts_check_delivery_balance,
    check_data_manipulation,
)

# 🟢 Auditoría History
from history.services import log_action


# ============================================================
# 🟩 HASHING PROFESIONAL — Para integridad inmutable
# ============================================================


def generate_delivery_hash(delivery: Delivery) -> str:
    """
    Genera un hash SHA-256 con un payload estable y ordenado.
    """
    payload = {
        "project_id": delivery.project_id,
        "purchase_id": delivery.purchase_id,
        "description": delivery.description,
        "quantity": float(delivery.quantity),
        "unit": delivery.unit,
        "date": str(delivery.date),
        "status": delivery.status,
        "metadata": delivery.metadata,
        "previous_hash": delivery.previous_hash,
    }
    return generate_sha256_hash(payload)


def update_delivery_hash(delivery: Delivery) -> None:
    """
    Regenera el hash actual del Delivery y lo guarda.
    Incluye auditoría completa.
    """

    # 🟡 Snapshot BEFORE
    before = Delivery.objects.get(id=delivery.id)

    # Generar hash
    delivery.content_hash = generate_delivery_hash(delivery)
    delivery.save(update_fields=["content_hash"])

    # 🟢 Auditoría
    log_action(
        action_type="delivery_hash_updated",
        user=getattr(delivery, "_current_user", None),
        instance_before=before,
        instance_after=delivery,
        project=delivery.project,
        metadata={"new_hash": delivery.content_hash},
    )


# ============================================================
# 🟦 CUADRE AUTOMÁTICO — Lógica avanzada + ALERTAS
# ============================================================


def evaluate_delivery_for_alerts(delivery: Delivery):
    """
    Evalúa TODAS las alertas relacionadas a deliveries.

    Incluye:
        ✔ entrega insuficiente
        ✔ entrega excedida
        ✔ entrega coherente/incoherente
        ✔ delivery sin purchase asociado
        ✔ manipulación sospechosa (hash)
    """

    # 🟡 BEFORE para auditoría
    before = Delivery.objects.get(id=delivery.id)

    # 🔸 1. Alertas automáticas de balance entrega vs compra
    alerts_check_delivery_balance(delivery)

    # 🔸 2. Al actualizar un Delivery, revisar integridad del hash
    check_data_manipulation(delivery)

    # 🟢 Auditoría de alertas evaluadas
    log_action(
        action_type="delivery_alerts_evaluated",
        user=getattr(delivery, "_current_user", None),
        instance_before=before,
        instance_after=delivery,
        project=delivery.project,
        metadata={"alert_engine": "balance + integrity"},
    )


# ============================================================
# 🟥 LÓGICA EXTENDIDA (Opcional / Fase futura)
# ============================================================


def generate_delivery_alerts(delivery: Delivery):
    """
    Hook para futuras alertas extendidas.
    """
    pass


from history.services import log_action, record_field_changes


def update_delivery(instance, data, user=None, reason=None):
    """
    Actualización PRO de Delivery con auditoría avanzada.
    - BEFORE snapshot
    - Aplicar cambios
    - AFTER snapshot
    - ChangeRecord por campo modificado
    - HistoryRecord general del evento
    """

    # BEFORE
    before = instance.__class__.objects.get(pk=instance.pk)

    # Aplicar cambios desde data
    for field, value in data.items():
        setattr(instance, field, value)

    instance.save()

    # AFTER
    after = instance.__class__.objects.get(pk=instance.pk)

    # Auditoría detallada campo-campo
    record_field_changes(
        instance_before=before,
        instance_after=after,
        user=user,
        reason=reason,
    )

    # Auditoría general
    log_action(
        action_type="delivery_updated",
        user=user,
        instance_before=before,
        instance_after=after,
        project=getattr(instance, "project", None),
        metadata={"reason": reason} if reason else {},
    )

    return instance
