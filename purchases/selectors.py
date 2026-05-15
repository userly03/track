from typing import Optional
from django.db.models import QuerySet
from django.core.exceptions import ValidationError

from .models import Purchase


# ============================================================
#   OBTENER UNA COMPRA POR ID (Nivel PRO)
# ============================================================


def get_purchase_by_id(purchase_id: int) -> Optional[Purchase]:
    """
    Devuelve una Purchase por ID o None si no existe.

    Razones para dejarlo simple:
        - 100% seguro de usar en views y services
        - Evita excepciones innecesarias
        - Compatible con lógica actual del proyecto
    """
    if purchase_id is None:
        return None

    try:
        return Purchase.objects.select_related("project").get(id=purchase_id)
    except Purchase.DoesNotExist:
        return None


# ============================================================
#   OBTENER TODAS LAS COMPRAS DE UN PROYECTO
# ============================================================


def get_purchases_by_project(project_id: int) -> QuerySet[Purchase]:
    """
    Retorna las compras asociadas a un proyecto específicas:
    - Optimización: select_related(project)
    - Compatibilidad: ordering por created_at
    """
    if project_id is None:
        raise ValidationError("project_id es obligatorio.")

    return (
        Purchase.objects.filter(project_id=project_id)
        .select_related("project")
        .order_by("-created_at")
    )


# ============================================================
#   SELECTOR AVANZADO (Nivel PRO)
#   Filtrado flexible para dashboards, reportes y KPIs
# ============================================================

VALID_STATUSES = {"pending", "approved", "observed"}


def get_purchases_filtered(
    project_id: Optional[int] = None,
    status: Optional[str] = None,
    min_total: Optional[float] = None,
    max_total: Optional[float] = None,
) -> QuerySet[Purchase]:
    """
    Selector avanzado para dashboards/reportes.

    Parámetros:
        project_id → filtrar por proyecto
        status     → pending | approved | observed
        min_total  → mínimo total_price
        max_total  → máximo total_price

    Mejoras agregadas:
        ✔ Validación de status
        ✔ Evitar filtros inconsistentes (min > max)
        ✔ select_related optimizado
    """

    qs = Purchase.objects.all().select_related("project")

    # Proyecto
    if project_id is not None:
        qs = qs.filter(project_id=project_id)

    # Validación de estado
    if status:
        status = status.lower().strip()
        if status not in VALID_STATUSES:
            raise ValidationError(f"Estado inválido: {status}")
        qs = qs.filter(status=status)

    # Validación de rangos
    if min_total is not None and max_total is not None:
        if min_total > max_total:
            raise ValidationError("min_total no puede ser mayor que max_total.")

    # total_price = quantity * unit_price
    if min_total is not None:
        qs = qs.filter(total_price__gte=min_total)

    if max_total is not None:
        qs = qs.filter(total_price__lte=max_total)

    return qs.order_by("-created_at")
