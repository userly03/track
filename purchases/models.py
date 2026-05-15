from django.db import models
from django.utils import timezone
from django.core.exceptions import ValidationError
from django.db.models import JSONField

import json
import hashlib


class Purchase(models.Model):
    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("approved", "Approved"),
        ("observed", "Observed"),
    ]

    project = models.ForeignKey(
        "projects.Project", on_delete=models.CASCADE, related_name="purchases"
    )

    # ===========================
    # DATOS PRINCIPALES
    # ===========================
    item_name = models.CharField(max_length=255)
    quantity = models.FloatField()
    unit_price = models.DecimalField(max_digits=12, decimal_places=2)

    total_price = models.DecimalField(max_digits=14, decimal_places=2, editable=False)

    supplier = models.CharField(max_length=255, blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")

    metadata = JSONField(default=dict, blank=True)

    # ===========================
    # USERS & SYSTEM DATA
    # ===========================
    created_by = models.ForeignKey(
        "users.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="purchases_created",
        help_text="Usuario que registró la compra.",
    )

    updated_by = models.ForeignKey(
        "users.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="purchases_updated",
        help_text="Último usuario que modificó la compra.",
    )

    content_hash = models.CharField(max_length=64, blank=True)
    previous_hash = models.CharField(max_length=64, blank=True)

    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Purchase #{self.id} - {self.item_name}"

    # ===========================
    # VALIDACIONES ROBUSTAS
    # ===========================
    def clean(self):
        errors = {}

        # --- Validación del nombre del ítem ---
        if not self.item_name or self.item_name.strip() == "":
            errors["item_name"] = "El nombre del ítem no puede estar vacío."

        if len(self.item_name) > 255:
            errors["item_name"] = "El nombre del ítem excede el límite permitido."

        # --- Validación de cantidad ---
        if self.quantity is None or self.quantity <= 0:
            errors["quantity"] = "La cantidad debe ser mayor que 0."

        # --- Validación de precio ---
        if self.unit_price is None or float(self.unit_price) <= 0:
            errors["unit_price"] = "El precio unitario debe ser mayor que 0."

        if errors:
            raise ValidationError(errors)

    # ===========================
    # CÁLCULO DEL TOTAL
    # ===========================
    def calculate_total(self):
        return float(self.quantity) * float(self.unit_price)

    # ===========================
    # CONTROL HASHING
    # ===========================
    def generate_hash(self):
        """
        Calcula sha256 basado en un JSON ordenado.
        Importante para auditoría.
        """
        data = {
            "project": self.project_id,
            "item_name": self.item_name,
            "quantity": self.quantity,
            "unit_price": float(self.unit_price),
            "supplier": self.supplier,
            "status": self.status,
            "metadata": self.metadata,
            "created_at": str(self.created_at),
        }

        encoded = json.dumps(data, sort_keys=True).encode()
        return hashlib.sha256(encoded).hexdigest()

    # ===========================
    # SAVE PERSONALIZADO
    # ===========================
    def save(self, *args, **kwargs):

        # 1. Ejecutar validaciones antes del guardado
        self.clean()

        # 2. Auto-calcular total
        self.total_price = self.calculate_total()

        # 3. Guardar previous_hash
        if self.pk:
            previous = Purchase.objects.get(pk=self.pk)
            self.previous_hash = previous.content_hash

        # 4. Generar nuevo hash
        self.content_hash = self.generate_hash()

        super().save(*args, **kwargs)
