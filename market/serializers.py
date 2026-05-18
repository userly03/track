from rest_framework import serializers
from market.models import MarketPrice


# ============================================================
#   VALIDACIÓN PRO PARA PRECIOS DE MERCADO
# ============================================================


class MarketPriceSerializer(serializers.Serializer):
    """
    Serializador oficial de TrackBuild v2 para precios de mercado.

    Importante:
    - Coincide exactamente con get_or_refresh_market_price()
    - Controla que la estructura devuelta sea válida.
    """

    query = serializers.CharField()
    market_avg = serializers.FloatField(allow_null=True, min_value=0)
    market_min = serializers.FloatField(allow_null=True, min_value=0)
    market_max = serializers.FloatField(allow_null=True, min_value=0)

    sources = serializers.ListField(child=serializers.CharField(), allow_empty=True)

    updated_at = serializers.DateTimeField(allow_null=True)

    def validate(self, data):
        """
        Validación cruzada básica para evitar incoherencias:
        - market_min <= market_avg <= market_max
        """
        avg = data.get("market_avg")
        min_price = data.get("market_min")
        max_price = data.get("market_max")

        # Si hay error del scraper → dejamos pasar
        if avg is None or min_price is None or max_price is None:
            return data

        if not (min_price <= avg <= max_price):
            raise serializers.ValidationError(
                "Los precios de mercado no son coherentes (min <= avg <= max)."
            )

        return data


# ============================================================
#   NUEVO SERIALIZADOR → LISTA DE MATERIALES DISPONIBLES
# ============================================================


class MaterialSerializer(serializers.ModelSerializer):
    """
    Serializador simple para listado de materiales válidos.
    Útil para poblar combos en el frontend sin permitir texto libre.
    """

    class Meta:
        model = MarketPrice
        fields = ["material_name", "market_avg", "market_min", "market_max"]

    def validate_material_name(self, value):
        value = value.strip().lower()
        if len(value) < 2:
            raise serializers.ValidationError("Nombre de material inválido.")
        return value
