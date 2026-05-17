from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import ProgressReport
from .services import (
    update_progress_hash,
    evaluate_progress_for_alerts,
)


@receiver(post_save, sender=ProgressReport)
def progress_post_save(sender, instance, created, **kwargs):
    # Evitar recursión: si la operación ya fue marcada como "no ejecutar signals", no hacemos nada
    if getattr(instance, "_disable_signals", False):
        return

    # Evitar ejecución al crear (ya se maneja en views/serializer)
    if created:
        return

    # Marcar para evitar loops
    instance._disable_signals = True

    update_progress_hash(instance)
    evaluate_progress_for_alerts(instance)

    # Limpieza
    instance._disable_signals = False
