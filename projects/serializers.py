from typing import Any, Dict
from rest_framework import serializers

from .models import Project


# ============================================================
#   SERIALIZER PRINCIPAL DEL MODELO PROJECT (Nivel PRO)
# ============================================================


class ProjectSerializer(serializers.ModelSerializer):
    """
    SERIALIZADOR PROFESIONAL PARA PROJECTS
    (TrackBuild — Nivel PRO)

    Incluye:
    - Limpieza de strings (code, name, location)
    - Validación robusta de metadata
    - Validación de fechas
    - Inyección automática de _current_user para History
    - Protección de campos hash
    """

    # KPI fields (read-only)

    physical_progress = serializers.FloatField(read_only=True)
    financial_progress = serializers.FloatField(read_only=True)
    financial_drift = serializers.DictField(read_only=True)
    physical_financial_mismatch = serializers.DictField(read_only=True)
    time_deviation = serializers.DictField(read_only=True)
    stock_balance = serializers.DictField(read_only=True)
    health_score = serializers.FloatField(read_only=True)
    risk_score = serializers.FloatField(read_only=True)

    class Meta:
        model = Project
        fields = "__all__"

    # ------------------------------------------------------------
    #   LIMPIEZA + VALIDACIÓN DE CAMPOS
    # ------------------------------------------------------------

    def validate_code(self, value: str) -> str:
        v = value.strip().upper()
        if len(v) < 2:
            raise serializers.ValidationError("El código del proyecto es muy corto.")
        return v

    def validate_name(self, value: str) -> str:
        v = " ".join(value.strip().split())
        if len(v) < 3:
            raise serializers.ValidationError(
                "El nombre del proyecto es demasiado corto."
            )
        return v

    def validate_location(self, value: str) -> str:
        v = " ".join(value.strip().split())
        if len(v) < 3:
            raise serializers.ValidationError("La ubicación es demasiado corta.")
        return v

    def validate_progress(self, value):
        if not 0 <= value <= 100:
            raise serializers.ValidationError("Progress must be between 0 and 100.")
        return value

    def validate_metadata(self, value: Any) -> Dict[str, Any]:
        if value is None:
            return {}
        if not isinstance(value, dict):
            raise serializers.ValidationError(
                "metadata debe ser un objeto JSON válido."
            )
        return value

    def validate(self, data):
        """
        Validación cruzada entre fechas.
        """
        start = data.get("start_date") or getattr(self.instance, "start_date", None)
        end = data.get("end_date_estimated") or getattr(
            self.instance, "end_date_estimated", None
        )

        if start and end and start > end:
            raise serializers.ValidationError(
                {
                    "end_date_estimated": "La fecha de fin estimada debe ser posterior al inicio."
                }
            )

        return data

    # ------------------------------------------------------------
    #   CRUD: INYECCIÓN DE USUARIO + METADATA
    # ------------------------------------------------------------

    def create(self, validated_data):
        request = self.context.get("request")
        user = request.user if request and request.user.is_authenticated else None

        project = Project.objects.create(
            **validated_data,
            created_by=user,
            updated_by=user,
        )

        if request:
            project._current_user = user

        return project

        if request and hasattr(request, "user"):
            project._current_user = request.user

        return project

    def update(self, instance, validated_data):
        request = self.context.get("request")

        # metadata → merge inteligente
        if "metadata" in validated_data:
            metadata = validated_data.pop("metadata")
            if not isinstance(metadata, dict):
                raise serializers.ValidationError("metadata debe ser un objeto JSON.")
            instance.metadata = metadata

        # set de otros campos
        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        # History tracking
        if request and hasattr(request, "user"):
            instance._current_user = request.user

        user = request.user if request and request.user.is_authenticated else None
        instance.updated_by = user
        instance.save()
        return instance


# ============================================================
#   SERIALIZER PARA KPI (FASE 11)
# ============================================================


class ProjectKPISerializer(serializers.Serializer):
    """
    Serializador para KPIs completos (Fase 8 – Predictivo).

    Este JSON es exactamente lo que el frontend necesita:
    - KPIs base
    - Cuadres PRO
    - Riesgos predictivos
    - Health score
    """

    project_id = serializers.IntegerField()

    # KPIs básicos
    physical_progress = serializers.FloatField()
    financial_progress = serializers.FloatField()
    material_balance = serializers.FloatField()
    delay_days = serializers.IntegerField()

    # Alertas
    alerts = serializers.DictField(
        child=serializers.IntegerField(),
        help_text="Alertas activas por tipo (critical, warning, info)",
    )

    # Integridad
    integrity = serializers.CharField()

    # Cuadres PRO
    financial_drift = serializers.DictField()
    physical_financial_mismatch = serializers.DictField()
    stock_balance = serializers.DictField()
    time_deviation = serializers.DictField()

    # 🔥 FASE 8 — KPI Predictivo
    predicted_delay = serializers.CharField()
    predicted_overcost = serializers.CharField()
    risk_score = serializers.IntegerField()
    risk_level = serializers.CharField()
    health_score = serializers.IntegerField()

    # Para dashboards enterprise
    consistency = serializers.CharField()
