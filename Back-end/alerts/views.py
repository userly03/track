from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend

from .models import Alert
from .serializers import AlertSerializer, AlertUpdateSerializer

# Auditoría History
from history.services import log_action

# Roles
from users.permissions import IsAdminRole


# ======================================================================
# 🔵 LISTAR ALERTAS (ADMIN Y SUPERVISOR — SIN FILTRADO POR PROYECTO)
# ======================================================================


class AlertListView(generics.ListAPIView):
    """
    Lista todas las alertas del sistema.

    Reglas:
    - Admin → ve TODAS las alertas
    - Supervisor → también ve TODAS las alertas (NO hay asignación de proyectos)
    """

    serializer_class = AlertSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["severity", "status", "item_type", "project"]

    def get_queryset(self):
        # Ambos roles pueden ver todas las alertas
        return Alert.objects.select_related("project").all().order_by("-created_at")


# ======================================================================
# 🔵 DETALLE DE ALERTA (ADMIN Y SUPERVISOR)
# ======================================================================


class AlertDetailView(generics.RetrieveAPIView):
    """
    Devuelve la alerta específica.

    Reglas:
    - Admin → ve cualquier alerta
    - Supervisor → ve cualquier alerta (NO se filtra por proyectos)
    """

    serializer_class = AlertSerializer
    queryset = Alert.objects.select_related("project").all()
    permission_classes = [IsAuthenticated]


# ======================================================================
# 🔵 RESOLVER / ACTUALIZAR ALERTA (SOLO ADMIN)
# ======================================================================


class AlertResolveView(generics.UpdateAPIView):
    """
    Permite resolver alertas:
    PATCH /alerts/<id>/resolve/
    {
        "status": "resolved"
    }

    Reglas:
    - SOLO admin puede resolver alertas
    """

    serializer_class = AlertUpdateSerializer
    queryset = Alert.objects.all()
    permission_classes = [IsAuthenticated, IsAdminRole]

    def patch(self, request, *args, **kwargs):
        alert = self.get_object()

        # Snapshot BEFORE
        before = Alert.objects.get(id=alert.id)
        previous_status = before.status

        serializer = self.get_serializer(alert, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)

        updated_alert = serializer.save()

        # Determinar tipo de acción
        action_type = (
            "alert_resolved"
            if previous_status != "resolved" and updated_alert.status == "resolved"
            else "alert_updated"
        )

        user = request.user if request.user.is_authenticated else None

        # Registrar en History
        log_action(
            action_type=action_type,
            user=user,
            instance_before=before,
            instance_after=updated_alert,
            project=updated_alert.project,
            metadata={
                "previous_status": previous_status,
                "new_status": updated_alert.status,
                "endpoint": "PATCH /alerts/<id>/resolve/",
            },
        )

        return Response(
            AlertSerializer(updated_alert).data,
            status=status.HTTP_200_OK,
        )
