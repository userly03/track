from django.contrib import admin
from .models import ProgressReport


@admin.register(ProgressReport)
class ProgressReportAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "project",
        "percentage",
        "status",
        "date",
        "created_at",
    )

    list_filter = (
        "status",
        "project",
        "date",
        "created_at",
    )

    search_fields = (
        "project__name",
        "project__code",
        "description",
    )

    readonly_fields = (
        "content_hash",
        "previous_hash",
        "created_at",
        "updated_at",
    )

    fieldsets = (
        (
            "Información del Proyecto",
            {
                "fields": ("project",),
            },
        ),
        (
            "Detalle del Avance",
            {
                "fields": ("description", "percentage", "date", "status"),
            },
        ),
        (
            "Metadata",
            {
                "fields": ("metadata",),
                "classes": ("collapse",),
            },
        ),
        (
            "Integridad (Hashes)",
            {
                "fields": ("content_hash", "previous_hash"),
            },
        ),
        (
            "Fechas",
            {
                "fields": ("created_at", "updated_at"),
            },
        ),
    )
