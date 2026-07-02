from rest_framework import serializers
from .models import Alert


class AlertSerializer(serializers.ModelSerializer):
    """
    Serializador principal para listar y detallar alertas.
    Es EXACTAMENTE lo que el frontend Next.js espera.
    """

    projectId = serializers.IntegerField(source="project.id", read_only=True)

    class Meta:
        model = Alert
        fields = [
            "id",
            "projectId",
            "severity",
            "title",
            "message",
            "status",
            "created_at",
            "resolved_at",
            "item_type",
            "item_id",
            "metadata",
        ]


class AlertUpdateSerializer(serializers.ModelSerializer):
    """
    Serializador para resolver alertas.
    Solo permite actualizar el estado y registra resolved_at automát.
    """

    class Meta:
        model = Alert
        fields = ["status"]

    def validate_status(self, value):
        if value not in ["resolved", "active"]:
            raise serializers.ValidationError("Estado inválido.")
        return value

    def update(self, instance, validated_data):
        # Si se está resolviendo la alerta → registrar timestamp
        if validated_data.get("status") == "resolved":
            instance.resolve()
        else:
            # Si se vuelve a 'active' (en caso raro)
            instance.status = "active"
            instance.resolved_at = None
            instance.save(update_fields=["status", "resolved_at"])
        return instance
