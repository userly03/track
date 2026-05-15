from django.contrib.auth.models import AbstractUser
from django.db import models
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
