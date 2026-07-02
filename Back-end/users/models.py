from django.contrib.auth.models import AbstractUser
from django.db import models
from django.db.models import Q
from django.db.models.functions import Lower
from django.conf import settings
import hashlib


class User(AbstractUser):
    ROLE_CHOICES = (
        ("admin", "Admin"),
        ("supervisor", "Supervisor"),
    )

    role = models.CharField(max_length=20, choices=ROLE_CHOICES)

    # Firma digital automática para auditoría, validación y reportes PDF
    digital_signature = models.CharField(max_length=256, blank=True, null=True)

    def __str__(self):
        return f"{self.username} ({self.role})"

    def _generate_digital_signature(self) -> str:
        """
        Genera una firma digital estable basada en datos del usuario.
        Se usa en validaciones, documentos, auditoría e informes PDF.
        No depende de la fecha/hora para que no cambie en cada edición.
        """
        base = f"{self.username}|{self.email}"
        return hashlib.sha256(base.encode("utf-8")).hexdigest()

    def save(self, *args, **kwargs):
        """
        Ajusta permisos y asegura consistencia del rol y la firma.
        """
        # Validar rol contra las opciones permitidas
        if self.role not in dict(self.ROLE_CHOICES):
            raise ValueError("Rol inválido.")

        # Ajustar permisos del staff según rol
        # self.is_staff = self.role == "admin"

        # Generar firma digital si no existe
        if not self.digital_signature:
            self.digital_signature = self._generate_digital_signature()

        super().save(*args, **kwargs)

    class Meta:
        verbose_name = "user"
        verbose_name_plural = "users"
        constraints = [
            models.UniqueConstraint(
                Lower("email"),
                condition=~Q(email=""),
                name="unique_non_empty_user_email_ci",
            )
        ]


class SocialAccount(models.Model):
    PROVIDER_GOOGLE = "google"
    PROVIDER_CHOICES = (
        (PROVIDER_GOOGLE, "Google"),
    )

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="social_accounts",
    )
    provider = models.CharField(max_length=50, choices=PROVIDER_CHOICES)
    provider_user_id = models.CharField(max_length=255)
    email = models.EmailField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["provider", "provider_user_id"],
                name="unique_social_provider_user_id",
            )
        ]

    def __str__(self):
        return f"{self.provider}:{self.provider_user_id} -> {self.user_id}"
