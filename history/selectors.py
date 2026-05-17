from typing import List, Optional

from django.db.models import QuerySet
from django.core.exceptions import ValidationError

from .models import HistoryRecord


# ======================================================
# SELECTOR PRINCIPAL: HISTORIAL POR PROYECTO
# ======================================================


def get_history_by_project(project_id: int, limit: Optional[int] = None) -> QuerySet:
    """
    Devuelve los registros de historial asociados a un proyecto.
    - Incluye prefetch de usuario y proyecto
    - Ordenado por fecha descendente
    """
    qs = (
        HistoryRecord.objects.select_related("user", "project")
        .filter(project_id=project_id)
        .order_by("-created_at")
    )

    if limit is not None:
        return qs[:limit]

    return qs


# ======================================================
# SELECTOR POR ENTIDAD ESPECÍFICA
# ======================================================


def get_history_for_instance(
    related_type: str, related_id: str, limit: Optional[int] = None
) -> QuerySet:
    """
    Devuelve el historial asociado a un modelo específico.
    Ejemplos:
        get_history_for_instance("purchase", "23")
        get_history_for_instance("alert", "5")
        get_history_for_instance("document", "99")
    """
    if not related_type:
        raise ValidationError("related_type is required")

    qs = (
        HistoryRecord.objects.select_related("user", "project")
        .filter(related_type=related_type.lower(), related_id=str(related_id))
        .order_by("-created_at")
    )

    if limit is not None:
        return qs[:limit]

    return qs


# ======================================================
# SELECTOR GENERAL: LISTA DE TODO EL HISTORIAL
# ======================================================


def list_all_history(limit: Optional[int] = None) -> QuerySet:
    """
    Devuelve todos los registros (para el modo Admin o Auditor).
    """
    qs = (
        HistoryRecord.objects.select_related("user", "project")
        .all()
        .order_by("-created_at")
    )

    if limit is not None:
        return qs[:limit]

    return qs


# ======================================================
# SELECTOR PARA DASHBOARD ADMIN (OPCIONAL)
# ======================================================


def get_recent_history(limit: int = 20) -> QuerySet:
    """
    Devuelve los últimos <limit> registros para dashboards en tiempo real.
    """
    return HistoryRecord.objects.select_related("user", "project").order_by(
        "-created_at"
    )[:limit]
