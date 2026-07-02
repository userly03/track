from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError, NotFound
from django.db import transaction

from .models import Purchase
from .serializers import PurchaseSerializer
from .selectors import (
    get_purchase_by_id,
    get_purchases_by_project,
)

from .services import evaluate_purchase_for_alerts
from history.services import log_action
from users.permissions import IsAdminOrReadOnly


# ============================================================
#  LIST + CREATE  (/api/purchases/)
# ============================================================


class PurchaseListCreateView(generics.ListCreateAPIView):
    """
    GET  /api/purchases/      → Lista todas las compras.
    POST /api/purchases/      → Crea una nueva compra.

    Mejoras:
    ✔ Manejo de errores robusto.
    ✔ Validación: evita project inexistente, metadata corrupto.
    ✔ Auditoría consistente.
    ✔ Llamada segura a MarketPriceService.
    """

    queryset = Purchase.objects.all().order_by("-created_at")
    serializer_class = PurchaseSerializer
    permission_classes = [IsAdminOrReadOnly]

    @transaction.atomic
    def perform_create(self, serializer):
        try:
            purchase = serializer.save()
        except Exception as e:
            raise ValidationError(f"Error al crear la compra: {e}")

        user = self.request.user if self.request.user.is_authenticated else None

        # Registrar creación en History
        log_action(
            action_type="purchase_created",
            user=user,
            instance_before=None,
            instance_after=purchase,
            project=purchase.project,
            metadata={
                "endpoint": "POST /api/purchases/",
                "client": str(self.request.META.get("REMOTE_ADDR", "")),
            },
        )

        # Intentar obtener precio de mercado sin romper flujo
        try:
            evaluate_purchase_for_alerts(purchase, user=user)
        except Exception as e:
            log_action(
                action_type="purchase_market_price_error",
                user=user,
                instance_before=None,
                instance_after=purchase,
                project=purchase.project,
                metadata={"error": str(e)},
            )

        return purchase


# ============================================================
#  DETAIL + UPDATE  (/api/purchases/<id>/)
# ============================================================


class PurchaseDetailView(generics.RetrieveUpdateAPIView):
    """
    GET    /api/purchases/<id>/   → Devuelve una compra
    PUT    /api/purchases/<id>/   → Reemplaza la compra
    PATCH  /api/purchases/<id>/   → Actualiza parcialmente

    Mejoras:
    ✔ get_object() robusto.
    ✔ Validación de compra inexistente.
    ✔ Auditoría before/after real.
    ✔ Reevaluación de market price controlada.
    """

    queryset = Purchase.objects.all()
    serializer_class = PurchaseSerializer
    permission_classes = [IsAdminOrReadOnly]

    def get_object(self):
        purchase = get_purchase_by_id(self.kwargs["pk"])
        if not purchase:
            raise NotFound("La compra no existe.")
        return purchase

    @transaction.atomic
    def perform_update(self, serializer):
        pk = self.kwargs["pk"]

        try:
            before = Purchase.objects.get(id=pk)
        except Purchase.DoesNotExist:
            raise NotFound("La compra no existe.")

        try:
            purchase = serializer.save()
        except Exception as e:
            raise ValidationError(f"Error al actualizar la compra: {e}")

        user = self.request.user if self.request.user.is_authenticated else None

        # Auditar actualización
        log_action(
            action_type="purchase_updated",
            user=user,
            instance_before=before,
            instance_after=purchase,
            project=purchase.project,
            metadata={
                "endpoint": "PUT/PATCH /api/purchases/<id>/",
                "client": str(self.request.META.get("REMOTE_ADDR", "")),
            },
        )

        # Reevaluar precio de mercado — seguro
        try:
            evaluate_purchase_for_alerts(purchase, user=user)
        except Exception as e:
            log_action(
                action_type="purchase_market_price_error",
                user=user,
                instance_before=before,
                instance_after=purchase,
                project=purchase.project,
                metadata={"error": str(e)},
            )

        return purchase
