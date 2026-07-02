from django.db import models
from django.utils import timezone
from projects.models import Project


class ProgressReport(models.Model):
    STATUS_CHOICES = (
        ("pending", "Pendiente"),
        ("approved", "Aprobado"),
        ("observed", "Observado"),
    )

    project = models.ForeignKey(
        Project, on_delete=models.CASCADE, related_name="progress_reports"
    )

    description = models.TextField()
    percentage = models.DecimalField(max_digits=5, decimal_places=2)
    date = models.DateField(default=timezone.now)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")

    # Django moderno usa JSONField desde django.db.models
    metadata = models.JSONField(default=dict, blank=True)
    # --- Usuario que creó el avance ---
    created_by = models.ForeignKey(
        "users.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="progress_reports_created",
        help_text="Usuario que registró el avance.",
    )

    # --- Último usuario que modificó el avance ---
    updated_by = models.ForeignKey(
        "users.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="progress_reports_updated",
        help_text="Último usuario que actualizó el avance.",
    )

    content_hash = models.CharField(max_length=64, blank=True)
    previous_hash = models.CharField(max_length=64, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-date", "-created_at"]

    def __str__(self):
        return f"Progress {self.id} - {self.project.code} ({self.percentage}%)"
