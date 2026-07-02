from django.db.models import Q

from .models import ValidationItem


# ============================================================
# ITEMS POR PROYECTO (compatible Fase 3 — W-de-N)
# ============================================================


def get_items_by_project(project_id: int):
    """
    Retorna todos los ValidationItem asociados a un project_id.
    Incluye los estados avanzados y datos del W-de-N.
    """

    return (
        ValidationItem.objects.filter(
            Q(purchase__project_id=project_id)
            | Q(delivery__project_id=project_id)
            | Q(progress__project_id=project_id)
            | Q(document__project_id=project_id)
        )
        .select_related(
            "purchase",
            "delivery",
            "progress",
            "document",
            "validated_by",
        )
        .order_by("-created_at")
    )


"""
Nota:
- get_pending_items() ya no se usa (reemplazado por get_pending_validations(user)).
- get_items_for_supervisor() ya no aplica (multirol + ValidationRecord).
Este archivo queda como selector complementario para vistas por proyecto.
"""
