from typing import Any, Dict
from rest_framework import serializers

from .models import Purchase
from projects.models import Project


class PurchaseSerializer(serializers.ModelSerializer):
    """
    SERIALIZADOR PRO — TrackBuild

    Ahora incluye:
    - projectId → FK normalizado
    - market_price
    - metadata limpia
    - validation_id  ← AÑADIDO para usar W-of-N desde frontend
    """

    projectId = serializers.PrimaryKeyRelatedField(
        queryset=Project.objects.all(),
        source="project",
    )

    total_price = serializers.DecimalField(
        max_digits=14, decimal_places=2, read_only=True
    )

    market_price = serializers.SerializerMethodField(read_only=True)

    # ⬇⬇⬇ NUEVO ⬇⬇⬇
    validation_id = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Purchase
        fields = [
            "id",
            "projectId",
            "item_name",
            "quantity",
            "unit_price",
            "supplier",
            "status",
            "metadata",
            "market_price",
            "total_price",
            "content_hash",
            "previous_hash",
            "created_at",
            "updated_at",
            "validation_id",  # ← AÑADIDO AQUÍ
        ]

        read_only_fields = [
            "market_price",
            "total_price",
            "content_hash",
            "previous_hash",
            "created_at",
            "updated_at",
            "validation_id",  # ← IMPORTANTE
        ]

    # ============================================================
    #   EXTRA FIELDS
    # ============================================================

    def get_market_price(self, obj: Purchase):
        meta = obj.metadata or {}
        return meta.get("market_price")

    # ============================================================
    #   NUEVA FUNCIÓN — obtener validation_id desde related_name
    # ============================================================

    def get_validation_id(self, obj: Purchase):
        """
        Obtiene la validación asociada (W-of-N) de esta compra.
        Si existen varias, toma la más reciente.
        """
        validation_item = obj.validation_items.order_by("-created_at").first()
        return validation_item.id if validation_item else None

    # ============================================================
    #   VALIDACIONES PRO
    # ============================================================

    def validate_item_name(self, value: str):
        if not isinstance(value, str):
            raise serializers.ValidationError("Nombre de ítem inválido.")

        value = value.strip()

        if len(value) < 2:
            raise serializers.ValidationError("El nombre del ítem es demasiado corto.")

        if len(value) > 255:
            raise serializers.ValidationError("El nombre del ítem es demasiado largo.")

        return " ".join(value.split())

    def validate_supplier(self, value):
        if value is None:
            return None

        if not isinstance(value, str):
            raise serializers.ValidationError("Proveedor inválido.")

        cleaned = value.strip()

        if cleaned == "":
            return None

        if len(cleaned) < 2:
            raise serializers.ValidationError("Proveedor demasiado corto.")

        return " ".join(cleaned.split())

    def validate_quantity(self, value):
        if value is None or value <= 0:
            raise serializers.ValidationError("La cantidad debe ser mayor que 0.")
        return value

    def validate_unit_price(self, value):
        if value is None or float(value) <= 0:
            raise serializers.ValidationError(
                "El precio unitario debe ser mayor que 0."
            )
        return value

    def validate_metadata(self, value: Any) -> Dict[str, Any]:
        if value is None:
            return {}
        if not isinstance(value, dict):
            raise serializers.ValidationError("metadata debe ser un JSON válido.")
        return value

    # ============================================================
    #   CREATE
    # ============================================================

    def create(self, validated_data):
        request = self.context.get("request")

        metadata = validated_data.get("metadata") or {}
        validated_data["metadata"] = metadata

        user = request.user if request and request.user.is_authenticated else None

        purchase = Purchase.objects.create(
            **validated_data,
            created_by=user,
            updated_by=user,
        )

        if request and hasattr(request, "user"):
            purchase._current_user = request.user

        return purchase

    # ============================================================
    #   UPDATE
    # ============================================================

    def update(self, instance, validated_data):
        request = self.context.get("request")

        metadata = validated_data.pop("metadata", None)
        if metadata is not None:
            if not isinstance(metadata, dict):
                raise serializers.ValidationError("metadata debe ser un JSON.")
            instance.metadata = metadata

        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        if request and hasattr(request, "user"):
            instance._current_user = request.user
            instance.updated_by = request.user

        instance.save()
        return instance
