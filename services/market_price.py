from django.utils import timezone
from market.models import MarketPrice, MarketPriceHistory
from services.scraping import get_market_price
from history.services import log_action


def preload_fake_prices():
    """
    Carga precios simulados al iniciar el servidor automáticamente.
    Esto garantiza que la BD siempre tenga datos desde cero.
    """
    default_materials = [
        "cemento",
        "arena",
        "fierro",
        "ladrillo",
        "yeso",
        "pvc",
        "clavos",
    ]

    for mat in default_materials:
        data = get_market_price(mat)

        MarketPrice.objects.update_or_create(
            material_name=mat,
            defaults={
                "market_avg": data["market_avg"],
                "market_min": data["market_min"],
                "market_max": data["market_max"],
                "sources": [data["source"]],
            },
        )


def get_or_refresh_market_price(material: str):
    """
    Obtiene precio de BD o actualiza usando scraping simulado.
    Nunca devuelve HTML ni datos corruptos.
    """
    material = material.lower().strip()
    mp, _ = MarketPrice.objects.get_or_create(material_name=material)

    # Obtener datos simulados
    scraped = get_market_price(material)

    # Si no existe el producto en nuestra tabla simulada
    if scraped.get("error") == "material_not_found":
        return {
            "query": material,
            "market_avg": None,
            "market_min": None,
            "market_max": None,
            "sources": [],
            "updated_at": timezone.now().isoformat(),
            "error": "material_not_found",
        }

    # Actualizar BD con precio nuevo
    mp.market_avg = scraped["market_avg"]
    mp.market_min = scraped["market_min"]
    mp.market_max = scraped["market_max"]
    mp.sources = [scraped["source"]]
    mp.save()

    # Registrar historial pro
    MarketPriceHistory.objects.create(
        material_name=material,
        market_avg=mp.market_avg,
        market_min=mp.market_min,
        market_max=mp.market_max,
        sources=mp.sources,
    )

    # Registrar en History general
    log_action(
        action_type="market_price_updated",
        user=None,
        instance_before=None,
        instance_after=mp,
        project=None,
        metadata={
            "material_name": material,
            "market_avg": mp.market_avg,
            "market_min": mp.market_min,
            "market_max": mp.market_max,
            "sources": mp.sources,
        },
    )

    # Respuesta API
    return {
        "query": material,
        "market_avg": mp.market_avg,
        "market_min": mp.market_min,
        "market_max": mp.market_max,
        "sources": mp.sources,
        "updated_at": mp.updated_at.isoformat(),
    }
