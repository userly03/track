from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import Delivery
from .services import (
    evaluate_delivery_for_alerts,
)


@receiver(post_save, sender=Delivery)
def delivery_post_save(sender, instance, created, **kwargs):
    """
    Eventos automáticos para Delivery:
        ✔ ejecuta alertas de balance (insuficiente/excedente)
        ✔ detecta manipulación de datos

    Nota:
    - El hash (content_hash / previous_hash) ahora es gestionado
      directamente por el modelo Delivery.save(), para evitar
      recursiones al llamar save() dentro de la señal.
    """
    # Solo evaluamos alertas, sin volver a hacer save()
    evaluate_delivery_for_alerts(instance)
