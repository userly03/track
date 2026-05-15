from typing import TYPE_CHECKING, Dict, Any
from django.core.exceptions import ObjectDoesNotExist
from django.db import transaction

from history.services import log_action, record_field_changes
from services.market_price import get_or_refresh_market_price

if TYPE_CHECKING:
    from purchases.models import Purchase


# ============================================================
# 1. HASH — CÁLCULO Y RECÁLCULO SEGURO
# ============================================================


def generate_purchase_hash(purchase: "Purchase") -> str:
    """
    Método seguro para generar el hash basado en model.generate_hash().
    """
    try:
        return purchase.generate_hash()
    except Exception as e:
        raise RuntimeError(f"Error al generar hash de Purchase #{purchase.id}: {e}")


def update_purchase_hash(purchase: "Purchase") -> str:
    """
    Recalcula el hash y registra auditoría.
    """

    try:
        before = purchase.__class__.objects.get(id=purchase.id)
    except ObjectDoesNotExist:
        raise RuntimeError("No se puede recalcular hash: compra no existe.")

    # Nuevos valores
    new_hash = purchase.generate_hash()

    purchase.content_hash = new_hash
    purchase.save(update_fields=["content_hash"])

    log_action(
        action_type="purchase_hash_updated",
        user=getattr(purchase, "_current_user", None),
        instance_before=before,
        instance_after=purchase,
        project=getattr(purchase, "project", None),
        metadata={"new_hash": new_hash},
    )

    return new_hash


# ============================================================
# 2. ALERTAS Y PRECIO DE MERCADO — VERSIÓN ESTABLE
# ============================================================


def evaluate_purchase_for_alerts(purchase: "Purchase", user=None):
    """
    Wrapper compatible con versiones antiguas. Ahora:
    - Obtiene precio del MarketPrice PRO
    - Lo coloca en metadata.market_price
    - Maneja fallos gracefully
    """

    material = (purchase.item_name or "").strip().lower()

    if len(material) < 2:
        raise ValueError("El nombre del material es demasiado corto para análisis.")

    # Obtener precio desde servicio PRO con manejo de errores
    try:
        market_price = get_or_refresh_market_price(material)
    except Exception as e:
        # Si falla el scraping/API/ML → NO rompemos el sistema
        market_price = None
        log_action(
            action_type="purchase_market_price_error",
            user=user,
            instance_before=None,
            instance_after=purchase,
            metadata={"error": str(e)},
        )

    # Guardar en metadata
    metadata = purchase.metadata if isinstance(purchase.metadata, dict) else {}

    metadata["market_price"] = market_price

    purchase.metadata = metadata
    purchase.save(update_fields=["metadata"])

    # Registrar auditoría
    log_action(
        action_type="purchase_market_price_updated",
        user=user,
        instance_before=None,
        instance_after=purchase,
        project=getattr(purchase, "project", None),
        metadata={"market_price": market_price},
    )

    return market_price


# ============================================================
# 3. ACTUALIZACIÓN PRO — TRANSACCIONAL Y AUDITADA
# ============================================================


def update_purchase(instance, data: Dict[str, Any], user=None, reason=None):
    """
    Actualiza un Purchase con:
    ✔ Transacción atómica
    ✔ Auditoría antes/después
    ✔ ChangeRecord por campo
    ✔ Manejo de errores controlado
    """

    if not isinstance(data, dict):
        raise ValueError("Los datos para actualizar deben ser un dict válido.")

    with transaction.atomic():

        # BEFORE snapshot
        try:
            before = instance.__class__.objects.get(pk=instance.pk)
        except ObjectDoesNotExist:
            raise RuntimeError("No se puede actualizar: compra no existe.")

        # Aplicar cambios
        for field, value in data.items():
            setattr(instance, field, value)

        instance.updated_by = user
        instance._current_user = user

        instance.save()

        # AFTER snapshot
        after = instance.__class__.objects.get(pk=instance.pk)

        # Registrar cambios campo por campo
        try:
            record_field_changes(
                instance_before=before,
                instance_after=after,
                user=user,
                reason=reason,
            )
        except Exception as e:
            raise RuntimeError(f"Error registrando cambios de compra: {e}")

        # Auditoría general
        log_action(
            action_type="purchase_updated",
            user=user,
            instance_before=before,
            instance_after=after,
            project=getattr(instance, "project", None),
            metadata={"reason": reason} if reason else {},
        )

        return instance
