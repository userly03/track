from typing import Any, Optional

from rest_framework import serializers

from .models import HistoryRecord, ChangeRecord


# ======================================================
# SERIALIZER PRO — HISTORY RECORD
# ======================================================


class HistoryRecordSerializer(serializers.ModelSerializer):
    """
    Serializador de solo lectura para el log de auditoría general.
    Consumido por paneles de administración / auditoría.
    """

    user = serializers.SerializerMethodField()
    projectId = serializers.SerializerMethodField()

    class Meta:
        model = HistoryRecord
        fields = (
            "id",
            "action_type",
            "user",
            "projectId",
            "related_type",
            "related_id",
            "previous_hash",
            "new_hash",
            "previous_data",
            "new_data",
            "metadata",
            "created_at",
        )
        read_only_fields = fields  # API inmutable total

    def get_user(self, obj: HistoryRecord) -> Optional[str]:
        if obj.user is None:
            return None
        username = getattr(obj.user, "username", None)
        return username if username else str(obj.user)

    def get_projectId(self, obj: HistoryRecord) -> Optional[int]:
        return obj.project_id if obj.project_id else None

    # Bloqueo total de modificación por API
    def create(self, validated_data: dict) -> Any:
        raise RuntimeError("HistoryRecord is read-only via API.")

    def update(self, instance: HistoryRecord, validated_data: dict) -> Any:
        raise RuntimeError("HistoryRecord is read-only via API.")


# ======================================================
# SERIALIZER PRO — CHANGE RECORD (AUDITORÍA DETALLADA)
# ======================================================


class ChangeRecordSerializer(serializers.ModelSerializer):
    """
    Serializador para auditoría de cambios campo-por-campo.
    Ideal para mostrar al auditor exactamente qué cambió.
    """

    changedBy = serializers.SerializerMethodField()
    objectId = serializers.SerializerMethodField()

    class Meta:
        model = ChangeRecord
        fields = (
            "id",
            "model_name",
            "objectId",
            "field",
            "old_value",
            "new_value",
            "reason",
            "changedBy",
            "timestamp",
            "hash_change",
        )
        read_only_fields = fields  # Inmutable total vía API

    def get_changedBy(self, obj: ChangeRecord) -> Optional[str]:
        if obj.changed_by is None:
            return None
        username = getattr(obj.changed_by, "username", None)
        return username if username else str(obj.changed_by)

    def get_objectId(self, obj: ChangeRecord) -> Optional[int]:
        """
        object_id es string, pero intentamos convertirlo a int para el frontend.
        Si no es convertible, devolvemos el string.
        """
        try:
            return int(obj.object_id)
        except Exception:
            return obj.object_id

    # Seguridad extra
    def create(self, validated_data: dict) -> Any:
        raise RuntimeError("ChangeRecord is read-only via API.")

    def update(self, instance: ChangeRecord, validated_data: dict) -> Any:
        raise RuntimeError("ChangeRecord is read-only via API.")
