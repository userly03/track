from django.db import models
from django.utils import timezone
from datetime import timedelta
from django.core.validators import MinValueValidator


class MarketPrice(models.Model):
    """
    Precio consolidado ACTUAL de un material.

    - Único por material_name
    - Contiene precios de mercado frescos (avg, min, max)
    - TTL: lo determina updated_at
    - Ideal para consultas rápidas desde el backend
    """

    material_name = models.CharField(max_length=255, unique=True, db_index=True)

    # precios consolidados
    market_avg = models.FloatField(null=True, validators=[MinValueValidator(0)])
    market_min = models.FloatField(null=True, validators=[MinValueValidator(0)])
    market_max = models.FloatField(null=True, validators=[MinValueValidator(0)])

    # lista de fuentes: ["MercadoLibre", "Sodimac"]
    sources = models.JSONField(default=list)

    # fecha de actualización (cache TTL)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Precio de Mercado Actual"
        verbose_name_plural = "Precios de Mercado Actuales"

    def __str__(self):
        return f"{self.material_name} — S/ {self.market_avg}"

    # -------------------------------
    # TTL: ¿está fresco este precio?
    # -------------------------------
    def is_fresh(self, hours: int = 24) -> bool:
        """
        Retorna True si el precio es reciente (menos de X horas).
        """
        if not self.updated_at:
            return False
        return timezone.now() - self.updated_at < timedelta(hours=hours)


class MarketPriceHistory(models.Model):
    """
    Historial detallado de precios para análisis, dashboards y auditoría.

    Se genera cada vez que:
    - se hace scraping nuevo
    - se refresca un MarketPrice
    """

    material_name = models.CharField(max_length=255, db_index=True)

    market_avg = models.FloatField(null=True, validators=[MinValueValidator(0)])
    market_min = models.FloatField(null=True, validators=[MinValueValidator(0)])
    market_max = models.FloatField(null=True, validators=[MinValueValidator(0)])

    # fuentes utilizadas en este snapshot
    sources = models.JSONField(default=list)

    # fecha de creación del snapshot
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Historial de Precio"
        verbose_name_plural = "Historial de Precios"

    def __str__(self):
        return f"[{self.created_at.date()}] {self.material_name}: {self.market_avg}"
