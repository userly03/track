from rest_framework import serializers
from .models import ProgressReport
from projects.models import Project
from .services import generate_progress_hash, update_progress_hash
from django.utils import timezone

from django.db import models


class ProgressReportSerializer(serializers.ModelSerializer):
    # Para compatibilidad con Next.js (usa projectId)
    projectId = serializers.IntegerField(source="project.id", read_only=True)

    class Meta:
        model = ProgressReport
        fields = [
            "id",
            "project",
            "projectId",
            "description",
            "percentage",
            "date",
            "status",
            "metadata",
            "content_hash",
            "previous_hash",
            "created_at",
            "updated_at",
        ]
        extra_kwargs = {
            "project": {"write_only": True},
            "content_hash": {"read_only": True},
            "previous_hash": {"read_only": True},
        }

    # -----------------------------
    # VALIDACIONES
    # -----------------------------
    def validate_percentage(self, value):
        if value < 0 or value > 100:
            raise serializers.ValidationError("El porcentaje debe estar entre 0 y 100.")
        return value

    def validate_date(self, value):
        if value > timezone.now().date():
            raise serializers.ValidationError("La fecha no puede ser futura.")
        return value

    def validate(self, attrs):
        """
        Validación general: que el total de avances de un proyecto no exceda 100%.
        """
        project = attrs.get("project") or self.instance.project
        new_percentage = attrs.get("percentage", None)

        # Sumar todos los avances existentes (excepto este si es update)
        existing_total = (
            project.progress_reports.exclude(
                id=getattr(self.instance, "id", None)
            ).aggregate(models.Sum("percentage"))["percentage__sum"]
            or 0
        )

        if new_percentage is not None and (existing_total + new_percentage) > 100:
            raise serializers.ValidationError(
                f"El avance total del proyecto no puede superar 100%. "
                f"Actualmente: {existing_total}%, nuevo: {new_percentage}%."
            )

        return attrs

    # -----------------------------
    # CREATE
    # -----------------------------
    def create(self, validated_data):
        request = self.context.get("request")
        user = request.user if request and request.user.is_authenticated else None

        instance = ProgressReport.objects.create(
            **validated_data,
            created_by=user,
            updated_by=user,
        )

        # Inicializar hash
        instance.content_hash = generate_progress_hash(instance)
        instance.save()

        # Para auditoría avanzada (alerts + history)
        instance._current_user = user

        return instance

    # -----------------------------
    # UPDATE
    # -----------------------------
    def update(self, instance, validated_data):
        # Guardar previous_hash antes del cambio
        request = self.context.get("request")
        user = request.user if request and request.user.is_authenticated else None

        instance.previous_hash = instance.content_hash

        for key, value in validated_data.items():
            setattr(instance, key, value)

        instance.updated_by = user

        instance.content_hash = update_progress_hash(instance)
        instance.save()

        # Para auditoría avanzada
        instance._current_user = user

        return instance
