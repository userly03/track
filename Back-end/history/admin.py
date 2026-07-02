from django.contrib import admin
from .models import HistoryRecord, ChangeRecord


# ======================================================
# ADMIN PRO — HISTORY RECORD
# ======================================================


@admin.register(HistoryRecord)
class HistoryRecordAdmin(admin.ModelAdmin):
    """
    Panel profesional de auditoría inmutable (acciones).
    Todo es solo lectura e inmodificable.
    """

    list_display = (
        "id",
        "action_type",
        "related_type",
        "related_id",
        "project",
        "user",
        "created_at",
    )

    list_filter = (
        "action_type",
        "related_type",
        "project",
        "user",
        "created_at",
    )

    search_fields = (
        "action_type",
        "related_id",
        "previous_hash",
        "new_hash",
    )

    ordering = ("-created_at",)

    readonly_fields = (
        "action_type",
        "user",
        "project",
        "related_type",
        "related_id",
        "previous_hash",
        "new_hash",
        "previous_data",
        "new_data",
        "metadata",
        "created_at",
    )

    # Inmutabilidad total
    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False

    actions = None


# ======================================================
# ADMIN PRO — CHANGE RECORD
# ======================================================


@admin.register(ChangeRecord)
class ChangeRecordAdmin(admin.ModelAdmin):
    """
    Vista profesional de cambios detallados por campo.
    """

    list_display = (
        "id",
        "model_name",
        "object_id",
        "field",
        "old_value_short",
        "new_value_short",
        "changed_by",
        "timestamp",
    )

    list_filter = (
        "model_name",
        "field",
        "changed_by",
        "timestamp",
    )

    search_fields = (
        "model_name",
        "object_id",
        "field",
        "old_value",
        "new_value",
    )

    ordering = ("-timestamp",)

    readonly_fields = (
        "model_name",
        "object_id",
        "field",
        "old_value",
        "new_value",
        "reason",
        "changed_by",
        "timestamp",
        "hash_change",
    )

    # Helpers para hacer la vista más limpia
    def old_value_short(self, obj):
        return str(obj.old_value)[:50] + ("..." if len(str(obj.old_value)) > 50 else "")

    old_value_short.short_description = "Old"

    def new_value_short(self, obj):
        return str(obj.new_value)[:50] + ("..." if len(str(obj.new_value)) > 50 else "")

    new_value_short.short_description = "New"

    # Inmutabilidad total
    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False

    actions = None
