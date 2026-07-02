from django.contrib import admin
from django.utils.html import format_html

from .models import MarketPrice, MarketPriceHistory


# ================================================================
#  ADMIN PRO DE MarketPrice (precio consolidado actual)
# ================================================================


@admin.register(MarketPrice)
class MarketPriceAdmin(admin.ModelAdmin):
    """
    Panel profesional para MarketPrice:
    - muestra precios consolidados
    - indica si el precio está fresco o expirado
    - permite buscar por material
    """

    list_display = (
        "material_name",
        "market_avg",
        "market_min",
        "market_max",
        "source_list",
        "fresh_status",
        "updated_at",
    )

    search_fields = ("material_name",)
    list_filter = ("updated_at",)
    ordering = ("material_name",)

    readonly_fields = (
        "material_name",
        "market_avg",
        "market_min",
        "market_max",
        "sources",
        "updated_at",
    )

    # ——————————————————————————————————————————————
    # Mostrar fuentes elegante
    # ——————————————————————————————————————————————
    def source_list(self, obj: MarketPrice):
        if not obj.sources:
            return "-"
        return ", ".join(obj.sources)

    source_list.short_description = "Fuentes"

    # ——————————————————————————————————————————————
    # Indicador verde/rojo de frescura del cache TTL
    # ——————————————————————————————————————————————
    def fresh_status(self, obj: MarketPrice):
        fresh = obj.is_fresh(hours=24)

        color = "green" if fresh else "red"
        text = "FRESCO" if fresh else "EXPIRADO"

        return format_html(
            '<span style="color:{}; font-weight:bold;">{}</span>',
            color,
            text,
        )

    fresh_status.short_description = "Estado Cache (24h)"


# ================================================================
#  ADMIN PRO DE MarketPriceHistory (historial completo)
# ================================================================


@admin.register(MarketPriceHistory)
class MarketPriceHistoryAdmin(admin.ModelAdmin):
    """
    Panel profesional para el historial de precios:
    - permite analizar tendencias
    - revisar de dónde provinieron los datos
    - revisar histórico por material
    """

    list_display = (
        "material_name",
        "market_avg",
        "market_min",
        "market_max",
        "source_list",
        "created_at",
    )

    search_fields = ("material_name",)
    list_filter = ("material_name", "created_at")
    ordering = ("-created_at",)

    readonly_fields = (
        "material_name",
        "market_avg",
        "market_min",
        "market_max",
        "sources",
        "created_at",
    )

    # Reutilizamos el formateo profesional de fuentes
    def source_list(self, obj: MarketPriceHistory):
        if not obj.sources:
            return "-"
        return ", ".join(obj.sources)

    source_list.short_description = "Fuentes"
