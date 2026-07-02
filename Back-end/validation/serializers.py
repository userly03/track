from rest_framework import serializers

from .models import ValidationItem, ValidationRecord
from users.models import User
from .services import add_validation_action


# ============================================================
# SERIALIZER PARA HISTORIAL DE VALIDACIONES (ValidationRecord)
# ============================================================


class ValidationRecordSerializer(serializers.ModelSerializer):
    validator = serializers.StringRelatedField(read_only=True)

    class Meta:
        model = ValidationRecord
        fields = [
            "id",
            "validator",
            "validator_role",
            "decision",
            "comment",
            "metadata",
            "content_hash",
            "previous_hash",
            "created_at",
        ]


# ============================================================
# LIST SERIALIZER (Vista de pendientes / bandejas)
# ============================================================


class ValidationItemListSerializer(serializers.ModelSerializer):
    related_id = serializers.SerializerMethodField()
    related_name = serializers.SerializerMethodField()  # ⭐ NUEVO
    project_id = serializers.SerializerMethodField()

    class Meta:
        model = ValidationItem
        fields = [
            "id",
            "type",
            "status",
            "required_approvals",
            "approvals_count",
            "rejections_count",
            "related_id",
            "related_name",  # ⭐ NUEVO
            "project_id",
            "created_at",
        ]

    def get_related_id(self, obj: ValidationItem):
        return obj.get_related_id()

    # ⭐⭐⭐ NOMBRE PROFESIONAL DEL ELEMENTO ⭐⭐⭐
    def get_related_name(self, obj: ValidationItem):
        if obj.type == "purchase" and obj.purchase:
            return obj.purchase.item_name or f"Compra #{obj.purchase.id}"

        if obj.type == "delivery" and obj.delivery:
            return obj.delivery.description or f"Entrega #{obj.delivery.id}"

        if obj.type == "progress" and obj.progress:
            return obj.progress.description or f"Avance #{obj.progress.id}"

        if obj.type == "document" and obj.document:
            return obj.document.title or f"Documento #{obj.document.id}"

        return None

    def get_project_id(self, obj: ValidationItem):
        if obj.type == "purchase" and obj.purchase:
            return obj.purchase.project_id
        if obj.type == "delivery" and obj.delivery:
            return obj.delivery.project_id
        if obj.type == "progress" and obj.progress:
            return obj.progress.project_id
        if obj.type == "document" and obj.document:
            return obj.document.project_id
        return None


# ============================================================
# DETAIL SERIALIZER (Detalle completo + historial)
# ============================================================


class ValidationItemSerializer(serializers.ModelSerializer):
    related_id = serializers.SerializerMethodField()
    related_name = serializers.SerializerMethodField()  # ⭐ NUEVO
    project_id = serializers.SerializerMethodField()
    validated_by = serializers.StringRelatedField(read_only=True)
    records = ValidationRecordSerializer(many=True, read_only=True)

    class Meta:
        model = ValidationItem
        fields = [
            "id",
            "type",
            "status",
            "required_approvals",
            "approvals_count",
            "rejections_count",
            "supervisor_comment",
            "metadata",
            "content_hash",
            "previous_hash",
            "validated_by",
            "validated_at",
            "related_id",
            "related_name",  # ⭐ NUEVO
            "project_id",
            "records",
            "created_at",
            "updated_at",
        ]

    def get_related_id(self, obj: ValidationItem):
        return obj.get_related_id()

    # ⭐ MISMA LÓGICA PROFESIONAL
    def get_related_name(self, obj: ValidationItem):
        if obj.type == "purchase" and obj.purchase:
            return obj.purchase.item_name or f"Compra #{obj.purchase.id}"

        if obj.type == "delivery" and obj.delivery:
            return obj.delivery.description or f"Entrega #{obj.delivery.id}"

        if obj.type == "progress" and obj.progress:
            return obj.progress.description or f"Avance #{obj.progress.id}"

        if obj.type == "document" and obj.document:
            return obj.document.title or f"Documento #{obj.document.id}"

        return None

    def get_project_id(self, obj: ValidationItem):
        if obj.type == "purchase" and obj.purchase:
            return obj.purchase.project_id
        if obj.type == "delivery" and obj.delivery:
            return obj.delivery.project_id
        if obj.type == "progress" and obj.progress:
            return obj.progress.project_id
        if obj.type == "document" and obj.document:
            return obj.document.project_id
        return None


# ============================================================
# ACTION SERIALIZERS (approve / reject via servicios W-de-N)
# ============================================================


class ValidationApproveSerializer(serializers.Serializer):

    comment = serializers.CharField(required=False, allow_blank=True)

    def save(self, **kwargs):
        request = self.context["request"]
        user: User = request.user
        item: ValidationItem = self.context["item"]

        comment = self.validated_data.get("comment", "") or ""

        result = add_validation_action(
            item_id=item.id,
            user=user,
            decision="approve",
            comment=comment,
        )
        return result


class ValidationRejectSerializer(serializers.Serializer):

    comment = serializers.CharField(required=True, allow_blank=False)

    def validate_comment(self, value: str):
        if len(value.strip()) < 3:
            raise serializers.ValidationError(
                "El comentario debe ser más descriptivo (mínimo 3 caracteres)."
            )
        return value.strip()

    def save(self, **kwargs):
        request = self.context["request"]
        user: User = request.user
        item: ValidationItem = self.context["item"]

        comment = self.validated_data["comment"]

        result = add_validation_action(
            item_id=item.id,
            user=user,
            decision="reject",
            comment=comment,
        )
        return result
