import logging
from django.db.models.signals import post_save
from django.dispatch import receiver

from purchases.models import Purchase
from validation.models import ValidationItem

logger = logging.getLogger(__name__)


# ============================================================
#   CREA ValidationItem AUTOMÁTICO AL CREAR PURCHASE
# ============================================================


@receiver(post_save, sender=Purchase)
def create_validation_item_on_purchase(sender, instance, created, **kwargs):
    """
    Crea automáticamente un ValidationItem para cada Purchase nueva.
    - No se ejecuta en actualizaciones (solo created=True)
    - Lee required_approvals desde metadata si existe
    """

    if not created:
        return

    metadata = instance.metadata or {}

    # Required approvals (default 1)
    try:
        required = int(metadata.get("required_approvals", 1))
    except Exception:
        required = 1
        logger.warning(
            "[Purchases] required_approvals inválido en metadata para Purchase %s",
            instance.id,
        )

    # Crear ValidationItem
    ValidationItem.objects.create(
        type="purchase",
        purchase=instance,
        required_approvals=required,
    )

    logger.info(
        "[Purchases] ValidationItem creado para Purchase %s con required_approvals=%s",
        instance.id,
        required,
    )
