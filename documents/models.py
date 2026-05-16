from django.conf import settings
from django.db import models
from django.db.models import JSONField

from projects.models import Project
from purchases.models import Purchase
from deliveries.models import Delivery
from progress_reports.models import ProgressReport


class Document(models.Model):
    """
    Documento vinculado a un proyecto y, opcionalmente, a compras/entregas/avances.

    Fase 4 — CONTROL DOCUMENTAL PRO:
    - version_number: versión lógica del documento.
    - file_hash: hash SHA256 del archivo físico.
    - previous_hash: hash de contenido anterior (cadena tipo blockchain ligera).
    - is_duplicate: marca si este registro es un duplicado exacto de otro.
    - original_document: referencia al documento "original" cuando es duplicado.
    - metadata PRO: autor, tipo, fecha de emisión, área, sensibilidad.
    """

    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("approved", "Approved"),
        ("observed", "Observed"),
    ]

    SENSITIVITY_CHOICES = [
        ("low", "Baja"),
        ("medium", "Media"),
        ("high", "Alta"),
        ("restricted", "Restringida"),
    ]

    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        related_name="documents",
    )

    # Enlaces opcionales a otras entidades operativas
    purchase = models.ForeignKey(
        Purchase,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="documents",
    )
    delivery = models.ForeignKey(
        Delivery,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="documents",
    )
    progress_report = models.ForeignKey(
        ProgressReport,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="documents",
    )

    # Datos principales
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)

    file = models.FileField(upload_to="documents/")

    # === CONTROL DOCUMENTAL PRO ===
    # Versión lógica del documento (1, 2, 3, ...)
    version_number = models.PositiveIntegerField(default=1)

    # Hash del archivo físico (SHA256)
    file_hash = models.CharField(max_length=64, blank=True)

    # Hash de contenido "interno" (incluye metadata, estado, etc.)
    content_hash = models.CharField(max_length=64, blank=True)

    # Hash de contenido previo: permite cadena de integridad
    previous_hash = models.CharField(max_length=64, blank=True)
    # Hash original del archivo físico (solo versión 1)
    original_hash = models.CharField(max_length=64, blank=True)

    # Marcador de duplicado + referencia al original
    is_duplicate = models.BooleanField(default=False)
    original_document = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="duplicates",
        help_text="Si es un duplicado, referencia al documento original.",
    )

    # Metadata flexible (JSON) + metadata PRO explícita
    metadata = JSONField(default=dict, blank=True)

    author = models.CharField(
        max_length=200,
        blank=True,
        help_text="Autor del documento.",
    )
    document_type = models.CharField(
        max_length=100,
        blank=True,
        help_text="Tipo de documento (plano, informe, contrato, etc.).",
    )
    issue_date = models.DateField(
        null=True,
        blank=True,
        help_text="Fecha de emisión del documento.",
    )
    responsible_area = models.CharField(
        max_length=150,
        blank=True,
        help_text="Área responsable (Ingeniería, Supervisión, Calidad, etc.).",
    )
    sensitivity_level = models.CharField(
        max_length=20,
        choices=SENSITIVITY_CHOICES,
        default="low",
        help_text="Nivel de sensibilidad del documento.",
    )

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="pending",
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # Usuario responsable de la última carga/modificación (opcional)
    # Se setea desde servicios (document._current_user = request.user)
    last_modified_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="modified_documents",
    )
    # --- Usuario que subió la versión inicial ---
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="uploaded_documents",
        help_text="Usuario que subió la primera versión del documento.",
    )

    # --- Usuario que realizó la última actualización ---
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="updated_documents",
        help_text="Usuario que modificó el documento por última vez.",
    )

    class Meta:
        ordering = ["project_id", "title", "-version_number"]
        indexes = [
            models.Index(fields=["project", "title"]),
            models.Index(fields=["file_hash"]),
            models.Index(fields=["content_hash"]),
        ]

    def save(self, *args, **kwargs):
        """
        Guardado PRO con mantenimiento de hashes.

        - Calcula file_hash si hay archivo.
        - Asigna previous_hash con el content_hash anterior (si existía).
        - Recalcula content_hash luego del primer save (para incluir timestamps).
        """
        from .services import (
            calculate_file_hash,
            generate_document_hash,
        )

        # 1. Obtener content_hash anterior (si existe) para previous_hash
        previous_content_hash = ""
        if self.pk:
            # Usamos self.__class__ para evitar imports circulares
            old = self.__class__.objects.filter(pk=self.pk).only("content_hash").first()
            if old and old.content_hash:
                previous_content_hash = old.content_hash

        # 2. Calcular hash del archivo si hay file
        if self.file:
            # Siempre recalculamos por simplicidad; en producción se podría optimizar
            self.file_hash = calculate_file_hash(self.file)

        # 3. Asignar previous_hash antes del primer save (cadena de integridad)
        if previous_content_hash:
            self.previous_hash = previous_content_hash

        # 4. Guardado base (crea/actualiza el registro)
        super().save(*args, **kwargs)

        # 5. Recalcular content_hash con todos los datos persistidos
        new_content_hash = generate_document_hash(self)

        # Solo actualizamos si cambió, para evitar writes innecesarios
        if new_content_hash != self.content_hash:
            self.content_hash = new_content_hash
            super().save(update_fields=["content_hash", "previous_hash"])

    def __str__(self):
        base = f"{self.title} - {self.project.code}"
        return f"{base} (v{self.version_number})"


class DocumentHistory(models.Model):
    """
    Historial de versiones y eventos del documento.

    No reemplaza al app 'history' global, sino que lo complementa:
    - Aquí se guarda la historia funcional del documento (versiones).
    - En 'history' se guarda la auditoría técnica transversal del sistema.

    Casos de uso:
    - Nueva versión subida.
    - Detección de duplicado.
    - Cambio de archivo (hash distinto).
    - Cambio de estado de validación (aprobado/observado/rechazado).
    """

    EVENT_TYPE_CHOICES = [
        ("created", "Documento creado"),
        ("version_created", "Nueva versión creada"),
        ("duplicate_detected", "Duplicado detectado"),
        ("metadata_updated", "Metadata actualizada"),
        ("file_changed", "Archivo modificado"),
        ("status_changed", "Estado modificado"),
        ("integrity_checked", "Integridad verificada"),
    ]

    document = models.ForeignKey(
        Document,
        on_delete=models.CASCADE,
        related_name="history_entries",
    )

    # Versión a la que se refiere esta entrada
    version_number = models.PositiveIntegerField()

    # Snapshot de hashes
    file_hash = models.CharField(max_length=64, blank=True)
    content_hash = models.CharField(max_length=64, blank=True)
    previous_hash = models.CharField(max_length=64, blank=True)

    # Datos de auditoría funcional
    event_type = models.CharField(
        max_length=50,
        choices=EVENT_TYPE_CHOICES,
        default="created",
    )
    performed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="document_history_actions",
    )
    comment = models.TextField(blank=True)

    # Snapshot de metadata en el momento del evento
    metadata_snapshot = JSONField(default=dict, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["document_id", "-version_number", "-created_at"]
        verbose_name_plural = "Document histories"

    def __str__(self):
        return f"Doc {self.document_id} v{self.version_number} - {self.event_type}"
