from django.contrib import admin
from .models import Purchase


@admin.register(Purchase)
class PurchaseAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "project",
        "item_name",
        "quantity",
        "unit_price",
        "total_price",
        "supplier",
        "status",
        "content_hash",
        "previous_hash",
        "created_at",
    )

    list_filter = ("status", "project")
    search_fields = ("item_name", "supplier")
    readonly_fields = ("content_hash", "previous_hash", "created_at", "updated_at")

    fieldsets = (
        (
            "Información básica",
            {
                "fields": (
                    "project",
                    "item_name",
                    "quantity",
                    "unit_price",
                    "total_price",
                    "supplier",
                    "status",
                )
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
            "Hashing y Auditoría",
            {
                "fields": ("content_hash", "previous_hash", "created_at", "updated_at"),
            },
        ),
    )
