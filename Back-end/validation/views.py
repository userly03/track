from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from .models import ValidationItem
from .serializers import (
    ValidationItemListSerializer,
    ValidationItemSerializer,
    ValidationApproveSerializer,
    ValidationRejectSerializer,
)
from .services import (
    ensure_user_can_validate,
    get_pending_validations,
    add_validation_action,
)
from users.models import User


# =============================================================
# LISTA DE PENDIENTES PARA CADA ROL (supervisor/auditor/contador)
# =============================================================
class ValidationItemListView(generics.ListAPIView):
    serializer_class = ValidationItemListSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user: User = self.request.user
        ensure_user_can_validate(user)
        return get_pending_validations(user)


# =============================================================
# DETALLE COMPLETO (incluye historial ValidationRecord)
# =============================================================
class ValidationItemDetailView(generics.RetrieveAPIView):
    queryset = ValidationItem.objects.all()
    serializer_class = ValidationItemSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        user: User = self.request.user
        ensure_user_can_validate(user)
        return super().get_object()


# =============================================================
# BASE PARA ACCIONES DE VALIDACIÓN
# =============================================================
class BaseValidationActionView(APIView):
    permission_classes = [IsAuthenticated]
    serializer_class = None  # definido en hijos
    decision_type = None  # "approve" o "reject"

    def get_item(self, item_id):
        try:
            return ValidationItem.objects.get(id=item_id)
        except ValidationItem.DoesNotExist:
            return None

    def post(self, request, item_id, *args, **kwargs):
        user = request.user
        ensure_user_can_validate(user)

        item = self.get_item(item_id)
        if not item:
            return Response(
                {"detail": "ValidationItem no encontrado."},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = self.serializer_class(
            data=request.data,
            context={"request": request, "item": item},
        )
        serializer.is_valid(raise_exception=True)

        # Ejecutar acción W-de-N
        add_validation_action(
            item_id=item.id,
            user=user,
            decision=self.decision_type,
            comment=serializer.validated_data.get("comment", ""),
        )

        item.refresh_from_db()
        return Response(
            ValidationItemSerializer(item).data,
            status=status.HTTP_200_OK,
        )


# =============================================================
# APPROVE (aprobación multirol, W-de-N)
# =============================================================
class ValidationApproveView(BaseValidationActionView):
    serializer_class = ValidationApproveSerializer
    decision_type = "approve"


# =============================================================
# REJECT (rechazo multirol, W-de-N)
# =============================================================
class ValidationRejectView(BaseValidationActionView):
    serializer_class = ValidationRejectSerializer
    decision_type = "reject"
