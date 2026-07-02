from django.db import models
from django.utils import timezone
from projects.models import Project
from purchases.models import Purchase
from trackbuild.utils.hashing import generate_sha256_hash


class Delivery(models.Model):
    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("approved", "Approved"),
        ("observed", "Observed"),
    ]

    project = models.ForeignKey(
        Project, on_delete=models.CASCADE, related_name="deliveries"
    )

    # Opcional: una entrega puede no tener compra asociada
    purchase = models.ForeignKey(
        Purchase,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="deliveries",
    )

    description = models.CharField(max_length=255)
    quantity = models.FloatField()
    unit = models.CharField(max_length=50, default="units")
    date = models.DateField(default=timezone.localdate)

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")

    metadata = models.JSONField(default=dict, blank=True)
    # --- Usuario que creó la entrega ---
    created_by = models.ForeignKey(
        "users.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="deliveries_created",
        help_text="Usuario que registró la entrega.",
    )

    # --- Último usuario que actualizó la entrega ---
    updated_by = models.ForeignKey(
        "users.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="deliveries_updated",
        help_text="Último usuario que modificó la entrega.",
    )

    # Auditoría + Integridad
    content_hash = models.CharField(max_length=128, blank=True)
    previous_hash = models.CharField(max_length=128, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # -----------------------------
    # 🔐 GENERACIÓN DE HASH
    # -----------------------------
    def compute_hash_payload(self):
        """
        Datos relevantes que forman el hash.
        """
        return {
            "project_id": self.project_id,
            "purchase_id": self.purchase_id,
            "description": self.description,
            "quantity": self.quantity,
            "unit": self.unit,
            "date": str(self.date),
            "status": self.status,
            "metadata": self.metadata,
            "previous_hash": self.previous_hash,
        }

    def update_hash(self):
        """
        Actualiza el content_hash en base al estado actual.
        """
        payload = self.compute_hash_payload()
        self.content_hash = generate_sha256_hash(payload)

    # -----------------------------
    # 🔄 OVERRIDE SAVE()
    # -----------------------------
    def save(self, *args, **kwargs):

        # Si ya existe → guardar previous_hash
        if self.pk:
            old = Delivery.objects.get(pk=self.pk)
            self.previous_hash = old.content_hash or ""

        # Generar nuevo hash
        self.update_hash()

        super().save(*args, **kwargs)

    def __str__(self):
        return f"Delivery {self.id} — {self.description}"
