from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import SocialAccount, User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    # Campos visibles en la tabla de usuarios
    list_display = ("id", "username", "email", "role", "is_staff")

    # Campos editables
    fieldsets = (
        (None, {"fields": ("username", "password")}),
        ("Información personal", {"fields": ("first_name", "last_name", "email")}),
        ("Rol y Firma", {"fields": ("role", "digital_signature")}),
        (
            "Permisos",
            {
                "fields": (
                    "is_active",
                    "is_staff",
                    "is_superuser",
                    "groups",
                    "user_permissions",
                )
            },
        ),
        ("Fechas importantes", {"fields": ("last_login", "date_joined")}),
    )

    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": ("username", "password1", "password2", "email", "role"),
            },
        ),
    )

    search_fields = ("username", "email")
    ordering = ("id",)


@admin.register(SocialAccount)
class SocialAccountAdmin(admin.ModelAdmin):
    list_display = ("id", "provider", "provider_user_id", "email", "user", "created_at")
    search_fields = ("provider_user_id", "email", "user__username")
    list_filter = ("provider",)
    readonly_fields = ("created_at", "updated_at")
