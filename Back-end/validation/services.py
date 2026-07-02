from django.utils import timezone
from django.db import transaction
from rest_framework.exceptions import PermissionDenied, ValidationError
from history.services import log_action

from .models import ValidationItem, ValidationRecord
from users.models import User

# Alertas Fase 8 / 9
from alerts.services import (
    check_late_validation,
    check_data_manipulation,
)

# Auditoría HISTORY
from history.services import log_action


# ============================================================
# 🔐 PERMISOS A NIVEL PRO — MULTIROL
# ============================================================

ALLOWED_ROLES = tuple(role for role, _ in User.ROLE_CHOICES)


def ensure_user_can_validate(user: User):
    """
    Verifica que el usuario tenga un rol autorizado.
    """
    if user.role not in ALLOWED_ROLES:
        raise PermissionDenied("No tienes permisos para validar ítems.")
    return True


# ============================================================
# 🛡️ REGLAS PRO — ANTES DE REGISTRAR DECISIÓN
# ============================================================


def _ensure_not_self_validation(item: ValidationItem, user: User):
    """
    Evita que un usuario valide un registro creado por él mismo,
    siempre que el modelo padre tenga el campo created_by.
    """
    parent = item.get_related_object()
    if not parent:
        return

    created_by = getattr(parent, "created_by", None)
    created_by_id = getattr(parent, "created_by_id", None)

    if (created_by and created_by == user) or (
        created_by_id and created_by_id == user.id
    ):
        raise PermissionDenied(
            "No puedes validar un registro que fue creado por ti mismo."
        )


def _ensure_not_duplicate_decision(item: ValidationItem, user: User):
    """
    Evita que el mismo usuario registre múltiples decisiones
    sobre el mismo ValidationItem.
    """
    if ValidationRecord.objects.filter(validation_item=item, validator=user).exists():
        raise ValidationError(
            f"Ya registraste una decisión para ValidationItem #{item.id}."
        )


# ============================================================
# 🧱 HELPERS INTERNOS
# ============================================================


def _get_item_or_error(item_id: int) -> ValidationItem:
    try:
        return ValidationItem.objects.get(id=item_id)
    except ValidationItem.DoesNotExist:
        raise ValidationError(f"ValidationItem #{item_id} no existe.")


def _register_record(item: ValidationItem, user: User, decision: str, comment: str):
    """
    Crea un ValidationRecord (hash encadenado profesional).
    """
    record = ValidationRecord.objects.create(
        validation_item=item,
        validator=user,
        validator_role=user.role,
        decision=decision,
        comment=comment.strip(),
        metadata={},
    )
    return record


# ============================================================
# 🧠 NÚCLEO DE W-DE-N — ACTUALIZACIÓN DE ESTADO
# ============================================================


def _recalculate_item_status(item: ValidationItem):
    """
    Recalcula el estado global del ValidationItem según:
    - approvals_count
    - rejections_count
    - required_approvals
    """

    if item.rejections_count > 0:
        item.status = "rejected"

    elif item.approvals_count == 0:
        item.status = "pending"

    elif 0 < item.approvals_count < item.required_approvals:
        item.status = "approved_partial"

    elif item.approvals_count >= item.required_approvals:
        item.status = "approved"

    else:
        item.status = "under_review"

    item.validated_at = timezone.now()
    item.update_hash()
    item.save()

    return item


# ============================================================
# ⭐ ACCIÓN PRINCIPAL — AÑADIR VALIDACIÓN
# ============================================================


@transaction.atomic
def add_validation_action(item_id: int, user: User, decision: str, comment: str = ""):
    """
    Registra un APPROVE o REJECT:
    - Multirol (supervisor, auditor, contador, admin)
    - Encadena hash
    - Incrementa contadores
    - Crea ValidationRecord
    - Recalcula estado W-de-N
    - Actualiza el modelo padre (Purchase/Delivery/etc.)
    - Aplica reglas PRO:
      * evitar auto-validación
      * evitar doble decisión por usuario
    """

    ensure_user_can_validate(user)
    item = _get_item_or_error(item_id)

    if decision not in ("approve", "reject"):
        raise ValidationError("Decision inválida (approve/reject).")

    # Reglas PRO antes de registrar nada
    _ensure_not_self_validation(item, user)
    _ensure_not_duplicate_decision(item, user)

    # Registrar acción (hash encadenado en ValidationRecord)
    record = _register_record(item, user, decision, comment)

    # Actualizar contadores W-de-N
    if decision == "approve":
        item.approvals_count += 1
    else:
        item.rejections_count += 1

    # Último usuario que intervino en la validación
    item.validated_by = user

    # Recalcular estado global
    updated_item = _recalculate_item_status(item)

    # Sincronizar con el objeto real
    # Sincronizar con el objeto real
    _sync_parent_status(updated_item)

    # Nueva alerta PRO según estado de validación
    from alerts.services import check_validation_status

    check_validation_status(updated_item)

    # ALERTAS BASE
    check_late_validation(item)
    check_data_manipulation(item)

    # HISTORY
    parent = item.get_related_object()
    project = getattr(parent, "project", None) if parent else None

    log_action(
        action_type=f"validation_{decision}",
        user=user,
        instance_before=None,  # no necesitamos before en cada record
        instance_after=item,
        project=project,
        metadata={
            "role": user.role,
            "comment": comment or None,
            "new_status": item.status,
            "required_approvals": item.required_approvals,
            "approvals": item.approvals_count,
            "rejections": item.rejections_count,
            "is_fully_approved": item.is_fully_approved(),
            "is_conflicted": item.is_conflicted(),
        },
    )

    return {
        "item_id": item.id,
        "type": item.type,
        "state": item.status,
        "required_approvals": item.required_approvals,
        "approvals": item.approvals_count,
        "rejections": item.rejections_count,
        "last_record_id": record.id,
    }


# ============================================================
# 🔄 SINCRONIZACIÓN CON PURCHASE / DELIVERY / PROGRESS / DOCUMENT
# ============================================================


def _sync_parent_status(item: ValidationItem):
    """
    Cuando el ValidationItem se aprueba/rechaza,
    se actualiza el modelo padre (purchase, delivery, etc.)
    sin romper la lógica anterior.
    """

    parent = item.get_related_object()
    if not parent:
        return

    # Estado final según validación
    if item.status == "approved":
        parent.status = "approved"
    elif item.status == "rejected":
        parent.status = "rejected"
    elif item.status == "approved_partial":
        parent.status = "observed"
    else:
        parent.status = "pending"

    parent.save(update_fields=["status"])


# ============================================================
# 📥 ELEMENTOS PENDIENTES PARA CADA ROL
# ============================================================


def get_pending_validations(user: User):
    ensure_user_can_validate(user)

    qs = ValidationItem.objects.filter(status__in=["pending", "under_review"])

    # Si es auditor, que solo vea algunos al azar (opcional)
    if user.role == "auditor":
        return qs.order_by("?")[:30]

    # Supervisor y contador ven todo lo pendiente
    return qs.order_by("created_at")


# ============================================================
# 🔒 AUTO-CLOSE (para ítems con expiración o conflicto)
# ============================================================


def auto_close_validation(item: ValidationItem):
    """
    Ítems que llevan demasiado tiempo sin resolverse
    o que han quedado en conflicto.
    """
    item.status = "auto_closed"
    item.update_hash()
    item.save()

    log_action(
        action_type="validation_auto_closed",
        user=None,
        instance_before=None,
        instance_after=item,
        project=(
            item.get_related_object().project if item.get_related_object() else None
        ),
        metadata={"reason": "timeout_or_conflict"},
    )

    return item
