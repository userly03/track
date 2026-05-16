from rest_framework import serializers
from .models import Delivery
from projects.models import Project
from purchases.models import Purchase


class DeliverySerializer(serializers.ModelSerializer):
    projectId = serializers.IntegerField(source="project_id")
    purchaseId = serializers.IntegerField(
        source="purchase_id", required=False, allow_null=True
    )

    class Meta:
        model = Delivery
        fields = [
            "id",
            "projectId",
            "purchaseId",
            "description",
            "quantity",
            "unit",
            "date",
            "status",
            "metadata",
            "content_hash",
            "previous_hash",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["content_hash", "previous_hash", "created_at", "updated_at"]

    # ----------------------------------------------------
    # ⚠ VALIDACIONES
    # ----------------------------------------------------
    def validate_quantity(self, value):
        if value <= 0:
            raise serializers.ValidationError("La cantidad debe ser mayor a 0.")
        return value

    def validate(self, attrs):
        """
        Validaciones cruzadas:
        - Validar que purchase pertenezca al proyecto correcto
        """

        # obtener project basado en projectId
        # obtener project basado en projectId (solo en CREATE)

        project_id = self.initial_data.get("projectId")

        if project_id:
            # Validar que el proyecto exista
            try:
                project = Project.objects.get(pk=project_id)
            except Project.DoesNotExist:
                raise serializers.ValidationError("El proyecto indicado no existe.")

            # Validar purchaseId (si viene)
            purchase_id = self.initial_data.get("purchaseId")
            if purchase_id:
                purchase = Purchase.objects.filter(pk=purchase_id).first()
                if purchase and purchase.project_id != project.id:
                    raise serializers.ValidationError(
                        "La compra seleccionada no pertenece al proyecto indicado."
                    )

        purchase_id = self.initial_data.get("purchaseId")

        if purchase_id:
            purchase = Purchase.objects.filter(pk=purchase_id).first()
            if purchase and purchase.project_id != project.id:
                raise serializers.ValidationError(
                    "La compra seleccionada no pertenece al proyecto indicado."
                )

        return attrs

    # ----------------------------------------------------
    # 🔄 CREATE
    # ----------------------------------------------------
    def create(self, validated_data):
        request = self.context.get("request")
        user = request.user if request and request.user.is_authenticated else None

        delivery = Delivery.objects.create(
            **validated_data,
            created_by=user,
            updated_by=user,
        )

        # Para auditoría avanzada (services + history)
        delivery._current_user = user

        return delivery

    # ----------------------------------------------------
    # 🔁 UPDATE
    # ----------------------------------------------------
    def update(self, instance, validated_data):
        request = self.context.get("request")
        user = request.user if request and request.user.is_authenticated else None

        # Aplicar cambios
        for field, value in validated_data.items():
            setattr(instance, field, value)

        instance.updated_by = user
        instance.save()

        # Para auditoría avanzada
        instance._current_user = user

        return instance
