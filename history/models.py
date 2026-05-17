from django.db import models
from django.contrib.auth import get_user_model
from django.utils import timezone
from projects.models import Project

User = get_user_model()


# ======================================================
# MODELO PRINCIPAL EXISTENTE (NO MODIFICADO)
# ======================================================


class HistoryRecord(models.Model):
    """
    Append-only immutable audit log.
    Registra cualquier acción relevante del sistema:
    compras, entregas, avances, validaciones, alertas, etc.
    """

    ACTION_MAX_LENGTH = 80
    TYPE_MAX_LENGTH = 40

    id = models.BigAutoField(primary_key=True)

    action_type = models.CharField(
        max_length=ACTION_MAX_LENGTH,
        help_text="Tipo de acción registrada (purchase_created, delivery_updated, etc.)",
    )

    user = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="history_actions",
        help_text="Usuario responsable, puede ser null si es acción del sistema",
    )

    project = models.ForeignKey(
        Project,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="history_records",
    )

    related_type = models.CharField(
        max_length=TYPE_MAX_LENGTH,
        help_text="Entidad afectada: purchase, delivery, progress, document, validation, alert, system",
    )

    related_id = models.CharField(
        max_length=80,
        help_text="ID del registro afectado en texto, para permitir flexibility",
    )

    previous_hash = models.CharField(
        max_length=128, blank=True, default="", help_text="Hash previo del registro"
    )

    new_hash = models.CharField(
        max_length=128, blank=True, default="", help_text="Nuevo hash del registro"
    )

    previous_data = models.JSONField(
        null=True, blank=True, help_text="Datos resumidos antes del cambio"
    )

    new_data = models.JSONField(
        null=True, blank=True, help_text="Datos resumidos después del cambio"
    )

    metadata = models.JSONField(
        default=dict, blank=True, help_text="Metadatos adicionales del evento"
    )

    created_at = models.DateTimeField(default=timezone.now, db_index=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "History Record"
        verbose_name_plural = "History Records"

    def save(self, *args, **kwargs):
        """
        Evita modificaciones: si ya existe en DB → no se permite actualizar.
        Solo se crean registros nuevos (append-only).
        """
        if self.pk is not None:
            raise RuntimeError(
                "HistoryRecord is immutable and cannot be modified once created."
            )
        super().save(*args, **kwargs)

    def __str__(self):
        return f"[{self.created_at}] {self.action_type} ({self.related_type}:{self.related_id})"


# ======================================================
# MODELO NUEVO — ChangeRecord (AUDITORÍA PRO)
# ======================================================


class ChangeRecord(models.Model):
    """
    Registro detallado de cambios a nivel de campo.
    Cada modificación genera una fila:
        - field: nombre del campo cambiado
        - old_value / new_value: valores previos vs nuevos
        - changed_by: usuario responsable
        - reason: razón del cambio (opcional)
        - hash_change: sha256 del cambio
    """

    id = models.BigAutoField(primary_key=True)

    model_name = models.CharField(
        max_length=80,
        help_text="Nombre del modelo afectado: purchase, delivery, project, etc.",
    )

    object_id = models.CharField(
        max_length=80, help_text="ID del objeto afectado (string para flexibilidad)"
    )

    field = models.CharField(max_length=120, help_text="Campo que fue modificado")

    old_value = models.JSONField(
        null=True, blank=True, help_text="Valor anterior del campo"
    )

    new_value = models.JSONField(
        null=True, blank=True, help_text="Valor nuevo del campo"
    )

    reason = models.TextField(
        null=True,
        blank=True,
        help_text="Razón del cambio (si el usuario aporta este dato)",
    )

    changed_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="field_changes",
        help_text="Usuario que realizó la modificación",
    )

    timestamp = models.DateTimeField(
        default=timezone.now, db_index=True, help_text="Fecha y hora del cambio"
    )

    hash_change = models.CharField(
        max_length=128, help_text="Hash sha256(old_value + new_value + timestamp)"
    )

    class Meta:
        ordering = ["-timestamp"]
        verbose_name = "Change Record"
        verbose_name_plural = "Change Records"

    def __str__(self):
        return f"{self.model_name}:{self.object_id} — {self.field}"
