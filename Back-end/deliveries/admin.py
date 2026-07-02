from django.contrib import admin
from .models import Delivery


@admin.register(Delivery)
class DeliveryAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "project",
        "purchase",
        "description",
        "quantity",
        "unit",
        "status",
        "date",
        "created_at",
    )

    list_filter = (
        "status",
        "date",
        "project",
        "purchase",
    )

    search_fields = (
        "description",
        "project__name",
        "purchase__item_name",
    )

    readonly_fields = (
        "content_hash",
        "previous_hash",
        "created_at",
        "updated_at",
    )

    fieldsets = (
        (
            "Información Principal",
            {
                "fields": (
                    "project",
                    "purchase",
                    "description",
                    "quantity",
                    "unit",
                    "date",
                    "status",
                )
            },
        ),
        ("Metadata", {"fields": ("metadata",), "classes": ("collapse",)}),
        (
            "Hash / Auditoría",
            {
                "fields": (
                    "content_hash",
                    "previous_hash",
                    "created_at",
                    "updated_at",
                ),
                "classes": ("collapse",),
            },
        ),
    )
