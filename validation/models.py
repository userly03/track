from django.db import models
from django.utils import timezone
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.db.models import JSONField

import hashlib
import json

User = get_user_model()


class ValidationItem(models.Model):
    """
    Representa la "caja" de validación para un ítem de negocio:
    - Purchase
    - Delivery
    - ProgressReport
    - Document

    Aquí se controla:
    - Estado global de validación (multirol, W-de-N simplificado).
    - Número de aprobaciones requeridas vs recibidas.
    - Encadenamiento por hash para auditoría.
    """

    TYPE_CHOICES = (
        ("purchase", "Purchase"),
        ("delivery", "Delivery"),
        ("progress", "Progress Report"),
        ("document", "Document"),
    )

    # Estados de VALIDACIÓN (no confundir con status del ítem de negocio)
    STATUS_CHOICES = (
        ("pending", "Pending"),
        ("under_review", "Under review"),
        ("approved_partial", "Approved partial"),
        ("approved", "Approved"),
        ("rejected", "Rejected"),
        ("auto_closed", "Auto closed"),
    )

    # -------------------------
    # MULTI-TIPO (un FK activo)
    # -------------------------
    type = models.CharField(max_length=20, choices=TYPE_CHOICES)

    purchase = models.ForeignKey(
        "purchases.Purchase",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="validation_items",
    )
    delivery = models.ForeignKey(
        "deliveries.Delivery",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="validation_items",
    )
    progress = models.ForeignKey(
        "progress_reports.ProgressReport",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="validation_items",
    )
    document = models.ForeignKey(
        "documents.Document",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="validation_items",
    )

    # -------------------------
    # ESTADO GLOBAL DE VALIDACIÓN W-de-N
    # -------------------------
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")

    # Cuántas aprobaciones se requieren para considerar "approved"
    required_approvals = models.PositiveSmallIntegerField(default=1)

    # Contadores acumulados (se alimentan desde ValidationRecord)
    approvals_count = models.PositiveSmallIntegerField(default=0)
    rejections_count = models.PositiveSmallIntegerField(default=0)

    # Comentario global (por ejemplo, del supervisor principal)
    supervisor_comment = models.TextField(blank=True, default="")

    # Último usuario que tocó la validación (cierre de ciclo, opcional)
    validated_by = models.ForeignKey(
        User,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="validated_items",
    )
    validated_at = models.DateTimeField(null=True, blank=True)

    # -------------------------
    # HASH & METADATA
    # -------------------------
    content_hash = models.CharField(max_length=128, blank=True)
    previous_hash = models.CharField(max_length=128, blank=True)
    metadata = JSONField(default=dict, blank=True)

    # -------------------------
    # CONTROL DE FECHAS
    # -------------------------
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # ===========================================
    # VALIDACIONES DE INTEGRIDAD (nivel Django)
    # ===========================================
    def clean(self):
        """
        Garantiza que:
        - Solo un FK esté presente según type.
        - type y FK sean coherentes.
        """
        fk_fields = {
            "purchase": self.purchase,
            "delivery": self.delivery,
            "progress": self.progress,
            "document": self.document,
        }

        selected_fk = fk_fields.get(self.type)
        if selected_fk is None:
            raise ValidationError(f"FK no válido para type={self.type}")

        active_fks = [v for v in fk_fields.values() if v is not None]
        if len(active_fks) > 1:
            raise ValidationError("Solo un FK debe estar activo por ValidationItem")

    # ===========================================
    # HELPERS
    # ===========================================
    def get_related_id(self):
        if self.type == "purchase" and self.purchase:
            return self.purchase.id
        if self.type == "delivery" and self.delivery:
            return self.delivery.id
        if self.type == "progress" and self.progress:
            return self.progress.id
        if self.type == "document" and self.document:
            return self.document.id
        return None

    def get_related_object(self):
        """
        Devuelve la instancia real asociada (Purchase, Delivery, etc.)
        o None si no existe.
        """
        if self.type == "purchase":
            return self.purchase
        if self.type == "delivery":
            return self.delivery
        if self.type == "progress":
            return self.progress
        if self.type == "document":
            return self.document
        return None
        # ===========================================

    # REGLAS W-DE-N (HELPERS PRO)
    # ===========================================
    def is_fully_approved(self) -> bool:
        """
        True cuando el ítem está completamente aprobado según W-de-N.
        """
        return (
            self.status == "approved"
            and self.approvals_count >= self.required_approvals
            and self.rejections_count == 0
        )

    def is_conflicted(self) -> bool:
        """
        True cuando hay aprobaciones y rechazos mezclados.
        No cambia el status por sí solo, pero sirve para auditoría y UI.
        """
        return (
            self.approvals_count > 0
            and self.rejections_count > 0
            and self.status not in ("rejected", "auto_closed")
        )

    # ===========================================
    # HASH PROFESIONAL
    # ===========================================
    def generate_hash_payload(self) -> dict:
        return {
            "id": self.id,
            "type": self.type,
            "record_id": self.get_related_id(),
            "status": self.status,
            "required_approvals": self.required_approvals,
            "approvals_count": self.approvals_count,
            "rejections_count": self.rejections_count,
            "supervisor_comment": self.supervisor_comment,
            "validated_by": self.validated_by_id,
            "validated_at": (
                self.validated_at.isoformat() if self.validated_at else None
            ),
            "metadata": self.metadata,
            "timestamp": timezone.now().isoformat(),
        }

    def compute_hash(self) -> str:
        payload = self.generate_hash_payload()
        json_str = json.dumps(payload, sort_keys=True)
        return hashlib.sha256(json_str.encode("utf-8")).hexdigest()

    def update_hash(self):
        self.previous_hash = self.content_hash or ""
        self.content_hash = self.compute_hash()

    # ===========================================
    # SAVE OVERRIDE (aplica hash)
    # ===========================================
    def save(self, *args, **kwargs):
        is_new = self.pk is None

        # Validamos integridad de FKs antes
        self.full_clean(exclude=None)

        if not is_new:
            # No es nuevo → actualizar previous_hash antes de recalcular
            self.update_hash()
        else:
            # Es nuevo → placeholders; luego recalculamos con ID
            self.content_hash = ""
            self.previous_hash = ""

        super().save(*args, **kwargs)

        # Después de tener ID, si era nuevo generamos hash real
        if is_new:
            self.update_hash()
            super().save(update_fields=["content_hash", "previous_hash"])

    def __str__(self):
        return f"ValidationItem #{self.id} [{self.type}] - {self.status}"


class ValidationRecord(models.Model):
    """
    Historial de acciones de validación para un ValidationItem.
    Cada registro representa una decisión de un usuario en un rol:
    - supervisor
    - auditor
    - contador
    - u otros roles futuros.

    Este modelo permite:
    - Implementar W-de-N.
    - Trazabilidad completa.
    - Hash encadenado por item.
    """

    DECISION_CHOICES = (
        ("approve", "Approve"),
        ("reject", "Reject"),
    )

    validation_item = models.ForeignKey(
        ValidationItem,
        on_delete=models.CASCADE,
        related_name="records",
    )

    validator = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="validation_records",
    )

    # Snapshot del rol del usuario al momento de validar
    validator_role = models.CharField(max_length=50)

    decision = models.CharField(max_length=20, choices=DECISION_CHOICES)

    comment = models.TextField(blank=True, default="")

    metadata = JSONField(default=dict, blank=True)

    content_hash = models.CharField(max_length=128, blank=True)
    previous_hash = models.CharField(max_length=128, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]

    # ==========================
    # HASH DE CADA VALIDACIÓN
    # ==========================
    def generate_hash_payload(self) -> dict:
        return {
            "id": self.id,
            "validation_item_id": self.validation_item_id,
            "validator_id": self.validator_id,
            "validator_role": self.validator_role,
            "decision": self.decision,
            "comment": self.comment,
            "metadata": self.metadata,
            "created_at": (
                self.created_at.isoformat()
                if self.created_at
                else timezone.now().isoformat()
            ),
            "previous_hash": self.previous_hash,
        }

    def compute_hash(self) -> str:
        payload = self.generate_hash_payload()
        json_str = json.dumps(payload, sort_keys=True)
        return hashlib.sha256(json_str.encode("utf-8")).hexdigest()

    def update_hash(self):
        self.previous_hash = self.previous_hash or ""
        self.content_hash = self.compute_hash()

    def save(self, *args, **kwargs):
        is_new = self.pk is None

        # Traer último record para encadenar previous_hash
        if is_new:
            last_record = (
                ValidationRecord.objects.filter(validation_item=self.validation_item)
                .order_by("-created_at", "-id")
                .first()
            )
            if last_record and last_record.content_hash:
                self.previous_hash = last_record.content_hash

        # Generar hash
        self.update_hash()

        super().save(*args, **kwargs)

    def __str__(self):
        return (
            f"ValidationRecord #{self.id} - "
            f"item={self.validation_item_id} - {self.validator_role} {self.decision}"
        )
