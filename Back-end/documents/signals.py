from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import Document


@receiver(post_save, sender=Document)
def document_post_save(sender, instance, created, **kwargs):
    """
    Eventos automáticos después de guardar un Document.
    """
    # Por ahora solo pasa, las alertas se implementarán después
    pass
