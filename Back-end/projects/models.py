from decimal import Decimal
import hashlib
import json

from django.db import models


class ProjectStatus(models.TextChoices):
    """
    Estados de alto nivel para un proyecto de obra.
    Esto ayuda mucho para filtros, dashboards y KPIs.
    """

    ACTIVE = "active", "Activo"
    PAUSED = "paused", "Pausado"
    COMPLETED = "completed", "Completado"
    CANCELLED = "cancelled", "Cancelado"


class Project(models.Model):
    """
    Modelo principal de Proyecto dentro de TrackBuild.

    Incluye:
    - Datos básicos de identificación
    - Fechas de inicio y fin estimado
    - Progreso declarado
    - Estado de negocio (status)
    - Metadata flexible (JSON)
    - Campos de integridad (content_hash, previous_hash)
    """

    code = models.CharField(
        max_length=50,
        unique=True,
        help_text="Código único del proyecto, ej. PRJ-001.",
    )
    name = models.CharField(
        max_length=200,
        help_text="Nombre descriptivo del proyecto de obra.",
    )
    location = models.CharField(
        max_length=200,
        help_text="Ubicación principal de la obra (ciudad, dirección, etc.).",
    )

    start_date = models.DateField(
        help_text="Fecha real de inicio del proyecto.",
    )
    end_date_estimated = models.DateField(
        help_text="Fecha estimada de finalización del proyecto.",
    )

    # Progreso físico declarado a nivel macro (0–100)
    progress = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal("0.00"),
        help_text="Progreso físico global del proyecto en porcentaje.",
    )

    status = models.CharField(
        max_length=50,
        choices=ProjectStatus.choices,
        default=ProjectStatus.ACTIVE,
        help_text="Estado actual del proyecto.",
    )

    # Metadata flexible: supervisor, presupuesto, tipo de obra, etc.
    metadata = models.JSONField(
        default=dict,
        blank=True,
        help_text="Metadatos flexibles del proyecto (supervisor, presupuesto, etc.).",
    )
    # --- Usuario que creó el proyecto ---
    created_by = models.ForeignKey(
        "users.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="projects_created",
        help_text="Usuario que registró el proyecto.",
    )

    # --- Último usuario que actualizó ---
    updated_by = models.ForeignKey(
        "users.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="projects_updated",
        help_text="Último usuario que modificó el proyecto.",
    )

    # Campos de integridad
    content_hash = models.CharField(
        max_length=64,
        blank=True,
        help_text="Hash SHA-256 del contenido actual del proyecto.",
    )
    previous_hash = models.CharField(
        max_length=64,
        blank=True,
        help_text="Hash SHA-256 del estado anterior del proyecto.",
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
        help_text="Fecha de creación del registro.",
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        help_text="Última fecha de actualización del registro.",
    )

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Project"
        verbose_name_plural = "Projects"

    # -------------------------------------------------------------
    # PROPIEDADES ÚTILES (para KPIs y dashboards)
    # -------------------------------------------------------------
    @property
    def budget(self):
        """
        Presupuesto del proyecto, si se almacena en metadata["budget"].
        """
        return self.metadata.get("budget")

    @property
    def supervisor_name(self):
        """
        Nombre del supervisor, si se almacena en metadata["supervisor"].
        """
        return self.metadata.get("supervisor")

    # -------------------------------------------------------------
    # HASH FUNCTIONS / INTEGRIDAD
    # -------------------------------------------------------------
    def generate_hash(self) -> str:
        """
        Genera un hash SHA-256 a partir de los campos clave del proyecto.
        Usado para garantizar integridad de la información.
        """
        data = {
            "code": self.code,
            "name": self.name,
            "location": self.location,
            "start_date": str(self.start_date),
            "end_date_estimated": str(self.end_date_estimated),
            "progress": float(self.progress),
            "status": self.status,
            "metadata": self.metadata,
        }

        json_str = json.dumps(data, sort_keys=True)
        return hashlib.sha256(json_str.encode("utf-8")).hexdigest()

    def has_integrity_issue(self) -> bool:
        """
        Devuelve True si el hash almacenado no coincide con el hash calculado.
        Esto será útil en la Fase 11 para el indicador de integridad.
        """
        calculated = self.generate_hash()
        return calculated != self.content_hash

    def save(self, *args, **kwargs):
        """
        Sobrescritura del save para:
        - Guardar el previous_hash con el hash antes de actualizar.
        - Recalcular siempre el content_hash con el estado actual.
        """
        if self.pk:
            old = Project.objects.get(pk=self.pk)
            self.previous_hash = old.content_hash

        # Recalcular hash de contenido
        self.content_hash = self.generate_hash()

        super().save(*args, **kwargs)

    def __str__(self) -> str:
        return f"{self.code} - {self.name}"
