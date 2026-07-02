from rest_framework import generics, status
from rest_framework.response import Response

from .models import Delivery
from .serializers import DeliverySerializer

# 🚀 Servicios modernos integrados con ALERTS (Fase 8)
from .services import (
    evaluate_delivery_for_alerts,
)

# 🟢 Auditoría History
from history.services import log_action
from users.permissions import IsAdminOrReadOnly


# ============================================================
# 📌 LISTAR / CREAR DELIVERIES
# ============================================================


class DeliveryListCreateView(generics.ListCreateAPIView):
    queryset = Delivery.objects.all().order_by("-created_at")
    serializer_class = DeliverySerializer
    permission_classes = [IsAdminOrReadOnly]

    def create(self, request, *args, **kwargs):
        # Validación
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # CREACIÓN
        delivery = serializer.save()

        # 🟢 Auditoría: creación de delivery
        user = request.user if request.user.is_authenticated else None

        log_action(
            action_type="delivery_created",
            user=user,
            instance_before=None,
            instance_after=delivery,
            project=delivery.project,
            metadata={"endpoint": "POST /api/deliveries/"},
        )

        # 🚨 Alertas inteligentes automáticas
        evaluate_delivery_for_alerts(delivery)

        return Response(
            self.get_serializer(delivery).data,
            status=status.HTTP_201_CREATED,
        )


# ============================================================
# 📌 DETALLE / ACTUALIZACIÓN / ELIMINACIÓN
# ============================================================


class DeliveryDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Delivery.objects.all()
    serializer_class = DeliverySerializer
    permission_classes = [IsAdminOrReadOnly]

    def update(self, request, *args, **kwargs):
        delivery = self.get_object()

        # Snapshot BEFORE
        before = Delivery.objects.get(id=delivery.id)

        # Validación + UPDATE
        serializer = self.get_serializer(delivery, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)

        updated_delivery = serializer.save()

        # 🟢 Auditoría: actualización
        user = request.user if request.user.is_authenticated else None

        log_action(
            action_type="delivery_updated",
            user=user,
            instance_before=before,
            instance_after=updated_delivery,
            project=updated_delivery.project,
            metadata={"endpoint": "PUT/PATCH /api/deliveries/<id>/"},
        )

        # 🚨 Reevaluación de alertas
        evaluate_delivery_for_alerts(updated_delivery)

        return Response(self.get_serializer(updated_delivery).data)
