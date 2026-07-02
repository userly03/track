from django.db import models
from django.utils import timezone
from django.core.validators import MinLengthValidator
from django.db.models import JSONField  # ✔ JSONField moderno (Django 4/5)

from projects.models import Project


class Alert(models.Model):
    """
    Alertas Inteligentes del sistema TrackBuild.
    """

    class ItemType(models.TextChoices):
        # Tipos existentes
        PURCHASE = "purchase", "Purchase"
        DELIVERY = "delivery", "Delivery"
        PROGRESS = "progress", "Progress Report"
        DOCUMENT = "document", "Document"
        SYSTEM = "system", "System Event"
        VALIDATION = "validation", "Validation"

        # ⭐️ NUEVOS TIPOS PRO — FASE 2
        SUPPLIER_RISK = "supplier_risk", "Supplier Risk"
        INACTIVITY = "inactivity", "Inactivity"
        OVERPRICE_TREND = "overprice_trend", "Overprice Trend"
        INCOMPLETE_DELIVERY = "incomplete_delivery", "Incomplete Delivery"
        NEGATIVE_STOCK = "negative_stock", "Negative Stock"
        PHYSICAL_STAGNATION = "physical_stagnation", "Physical Stagnation"

    class Severity(models.TextChoices):
        CRITICAL = "critical", "Critical"
        WARNING = "warning", "Warning"
        INFO = "info", "Info"

    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        RESOLVED = "resolved", "Resolved"

    project = models.ForeignKey(
        Project, on_delete=models.CASCADE, related_name="alerts"
    )

    item_type = models.CharField(max_length=50, choices=ItemType.choices)
    item_id = models.PositiveIntegerField()

    title = models.CharField(max_length=200, validators=[MinLengthValidator(5)])
    message = models.TextField()

    severity = models.CharField(
        max_length=20, choices=Severity.choices, default=Severity.INFO
    )

    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.ACTIVE
    )

    created_at = models.DateTimeField(auto_now_add=True)
    resolved_at = models.DateTimeField(null=True, blank=True)

    metadata = JSONField(default=dict, blank=True)

    def resolve(self):
        self.status = self.Status.RESOLVED
        self.resolved_at = timezone.now()
        self.save(update_fields=["status", "resolved_at"])

    def __str__(self):
        return f"[{self.severity.upper()}] {self.title} ({self.project.code})"

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Alert"
        verbose_name_plural = "Alerts"
        constraints = [
            models.UniqueConstraint(
                fields=["project", "item_type", "item_id"], name="unique_alert_per_item"
            )
        ]
