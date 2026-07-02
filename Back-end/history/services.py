import json
import hashlib
from typing import Any, Dict, Optional

from django.db import transaction
from django.core.exceptions import ObjectDoesNotExist
from django.forms.models import model_to_dict
from django.utils import timezone

from .models import HistoryRecord, ChangeRecord


# ======================================================
# HELPERS: SERIALIZACIÓN SEGURA
# ======================================================


def extract_core_fields(instance) -> Dict[str, Any]:
    """
    Extrae los campos relevantes de un modelo.
    Compatible con auditoría.
    """
    if instance is None:
        return {}

    data = {}

    for field in instance._meta.get_fields():
        name = field.name

        # Skip reverse relations
        if field.auto_created and not field.concrete:
            continue

        # Archivo pesado → ignorar
        if field.get_internal_type() in ["FileField", "ImageField"]:
            data[name] = None
            continue
        if name in ["validated_by"]:  # evitar FK pesadas
            data[name] = getattr(instance, f"{name}_id", None)
            continue

        # FK → solo el id
        if field.many_to_one or field.one_to_one:
            data[name] = getattr(instance, f"{name}_id", None)
            continue

        try:
            value = getattr(instance, name)
        except Exception:
            continue

        data[name] = value

    return data


def serialize_model(instance) -> Dict[str, Any]:
    """
    Limpia el modelo para registro JSON safe.
    """
    if instance is None:
        return {}

    def safe(v):
        try:
            json.dumps(v)
            return v
        except Exception:
            return str(v)

    core = extract_core_fields(instance)
    return {k: safe(v) for k, v in core.items()}


# ======================================================
# HASHES DE MODELO
# ======================================================


def capture_hashes(instance) -> Dict[str, str]:
    """
    Retorna previous_hash y new_hash sin fallar.
    """
    if instance is None:
        return {"previous_hash": "", "new_hash": ""}

    return {
        "previous_hash": getattr(instance, "previous_hash", "") or "",
        "new_hash": getattr(instance, "content_hash", "") or "",
    }


# ======================================================
# FUNCIÓN CENTRAL EXISTENTE (NO MODIFICADA)
# ======================================================


@transaction.atomic
def log_action(
    action_type: str,
    user,
    instance_before=None,
    instance_after=None,
    project=None,
    metadata: Optional[Dict[str, Any]] = None,
) -> HistoryRecord:

    if metadata is None:
        metadata = {}

    target_instance = instance_after or instance_before

    related_type = (
        target_instance.__class__.__name__.lower() if target_instance else "system"
    )

    try:
        related_id = str(getattr(target_instance, "id", None))
    except Exception:
        related_id = None

    hash_info = capture_hashes(target_instance)

    before_data = serialize_model(instance_before)
    after_data = serialize_model(instance_after)

    if project is None and target_instance:
        project = getattr(target_instance, "project", None)
        if project is None:
            # fallback seguro
            project_id = getattr(target_instance, "project_id", None)
            if project_id:
                from projects.models import Project

                try:
                    project = Project.objects.get(id=project_id)
                except Project.DoesNotExist:
                    project = None

    history_record = HistoryRecord.objects.create(
        action_type=action_type,
        user=user if user and getattr(user, "is_authenticated", False) else None,
        project=project,
        related_type=related_type,
        related_id=related_id,
        previous_hash=hash_info["previous_hash"],
        new_hash=hash_info["new_hash"],
        previous_data=before_data,
        new_data=after_data,
        metadata=metadata or {},
    )

    return history_record


# ======================================================
# NUEVO PRO: DETECCIÓN DE CAMBIOS CAMPO-POR-CAMPO
# ======================================================


def _generate_change_hash(old_value, new_value, timestamp_str: str) -> str:
    """
    Hash SHA256 de old + new + timestamp.
    """
    raw = f"{old_value}|{new_value}|{timestamp_str}"
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


@transaction.atomic
def record_field_changes(
    instance_before,
    instance_after,
    user,
    reason: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Compara instancia antes/después y registra un ChangeRecord por cada campo
    que cambió.

    Retorna:
    {
        "changes": [
            { "field": "...", "old": X, "new": Y }
        ],
        "changed_by": "...",
        "timestamp": "..."
    }
    """

    if instance_before is None or instance_after is None:
        return {"changes": []}

    before = serialize_model(instance_before)
    after = serialize_model(instance_after)

    model_name = instance_after.__class__.__name__.lower()
    object_id = str(getattr(instance_after, "id", None))

    changes = []

    IGNORED = {"content_hash", "previous_hash", "updated_at", "validated_at"}

    for field, old_val in before.items():
        if field in IGNORED:
            continue
        new_val = after.get(field)

        if old_val != new_val:
            # timestamp por consistencia
            timestamp = timezone.now()
            timestamp_str = timestamp.isoformat()

            hash_change = _generate_change_hash(old_val, new_val, timestamp_str)

            ChangeRecord.objects.create(
                model_name=model_name,
                object_id=object_id,
                field=field,
                old_value=old_val,
                new_value=new_val,
                reason=reason,
                changed_by=user,
                timestamp=timestamp,
                hash_change=hash_change,
            )

            changes.append(
                {
                    "field": field,
                    "old": old_val,
                    "new": new_val,
                }
            )

    return {
        "changes": changes,
        "changed_by": getattr(user, "username", None) if user else None,
        "timestamp": timezone.now().isoformat(),
    }
