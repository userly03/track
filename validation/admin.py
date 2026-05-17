from django.contrib import admin
from .models import ValidationItem, ValidationRecord


# ============================================================
# INLINE PARA HISTORIAL — ValidationRecord
# ============================================================


class ValidationRecordInline(admin.TabularInline):
    model = ValidationRecord
    extra = 0
    can_delete = False

    readonly_fields = (
        "validator",
        "validator_role",
        "decision",
        "comment",
        "metadata",
        "content_hash",
        "previous_hash",
        "created_at",
    )

    fieldsets = (
        (
            "Registro de Validación",
            {
                "fields": (
                    "validator",
                    "validator_role",
                    "decision",
                    "comment",
                    "metadata",
                    ("content_hash", "previous_hash"),
                    "created_at",
                )
            },
        ),
    )

    ordering = ("created_at",)


# ============================================================
# ADMIN PRINCIPAL — ValidationItem
# ============================================================


@admin.register(ValidationItem)
class ValidationItemAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "type",
        "status",
        "required_approvals",
        "approvals_count",
        "rejections_count",
        "get_related_id",
        "validated_by",
        "validated_at",
        "created_at",
    )

    list_filter = (
        "type",
        "status",
        "validated_by",
        "required_approvals",
        "created_at",
        "validated_at",
    )

    search_fields = (
        "id",
        "supervisor_comment",
        "metadata",
        "content_hash",
        "previous_hash",
    )

    readonly_fields = (
        "content_hash",
        "previous_hash",
        "validated_by",
        "validated_at",
        "approvals_count",
        "rejections_count",
        "created_at",
        "updated_at",
    )

    fieldsets = (
        (
            "Información General",
            {
                "fields": (
                    "type",
                    "get_related_id",
                    "status",
                )
            },
        ),
        (
            "Configuración W-de-N",
            {
                "fields": (
                    "required_approvals",
                    "approvals_count",
                    "rejections_count",
                )
            },
        ),
        (
            "Validación Actual",
            {
                "fields": (
                    "validated_by",
                    "validated_at",
                    "supervisor_comment",
                )
            },
        ),
        (
            "Hash & Auditoría",
            {
                "fields": (
                    "content_hash",
                    "previous_hash",
                    "metadata",
                    "created_at",
                    "updated_at",
                )
            },
        ),
    )

    inlines = [ValidationRecordInline]

    def get_related_id(self, obj):
        return obj.get_related_id()

    get_related_id.short_description = "Related Record ID"


# ============================================================
# ADMIN INDIVIDUAL PARA ValidationRecord (opcional)
# ============================================================


@admin.register(ValidationRecord)
class ValidationRecordAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "validation_item",
        "validator",
        "validator_role",
        "decision",
        "created_at",
    )

    list_filter = (
        "validator_role",
        "decision",
        "created_at",
    )

    search_fields = (
        "id",
        "validator__username",
        "validation_item__id",
        "content_hash",
    )

    readonly_fields = (
        "validation_item",
        "validator",
        "validator_role",
        "decision",
        "comment",
        "metadata",
        "content_hash",
        "previous_hash",
        "created_at",
    )
