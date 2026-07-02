from .models import Delivery
from django.db.models import QuerySet


# ---------------------------------------------------------
# 🔍 OBTENER ENTREGAS POR PROYECTO
# ---------------------------------------------------------
def get_deliveries_by_project(project_id: int) -> QuerySet:
    """
    Devuelve todas las entregas pertenecientes a un proyecto.
    """
    return Delivery.objects.filter(project_id=project_id).order_by("-created_at")


# ---------------------------------------------------------
# 🔍 OBTENER ENTREGA POR ID
# ---------------------------------------------------------
def get_delivery_by_id(delivery_id: int) -> Delivery:
    """
    Devuelve una entrega específica por su ID.
    """
    return Delivery.objects.get(pk=delivery_id)


# ---------------------------------------------------------
# 🔍 OBTENER ENTREGAS POR COMPRA
# ---------------------------------------------------------
def get_deliveries_by_purchase(purchase_id: int) -> QuerySet:
    """
    Devuelve todas las entregas asociadas a una compra.
    """
    return Delivery.objects.filter(purchase_id=purchase_id).order_by("-date")
