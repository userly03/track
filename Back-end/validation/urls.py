from django.urls import path
from .views import (
    ValidationItemListView,
    ValidationItemDetailView,
    ValidationApproveView,
    ValidationRejectView,
)

urlpatterns = [
    # Lista de ítems pendientes (supervisor, auditor, contador, admin)
    path("", ValidationItemListView.as_view(), name="validation-list"),
    # Detalle completo (incluye historial)
    path("<int:pk>/", ValidationItemDetailView.as_view(), name="validation-detail"),
    # Acciones de validación W-de-N
    path(
        "<int:item_id>/approve/",
        ValidationApproveView.as_view(),
        name="validation-approve",
    ),
    path(
        "<int:item_id>/reject/",
        ValidationRejectView.as_view(),
        name="validation-reject",
    ),
]
