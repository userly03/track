from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from services.market_price import get_or_refresh_market_price
from services.scraping import get_market_price  # fake/simulated scraper

from market.models import MarketPrice
from .serializers import MarketPriceSerializer, MaterialSerializer


# ============================================================
# 0. ML LEGACY → Dummy para compatibilidad antigua
# ============================================================


def get_ml_price(material: str):
    """
    Versión legacy — mantiene compatibilidad con scraping antiguo.
    """
    return {
        "source": "MercadoLibre (disabled)",
        "market_avg": None,
        "market_min": None,
        "market_max": None,
        "count": 0,
    }


# ============================================================
# 1. /market/price/?material=cemento    (Precio Consolidado PRO)
# ============================================================


class MarketPriceAPIView(APIView):
    """
    Devuelve un precio consolidado desde el sistema MarketPrice PRO.
    """

    def get(self, request, *args, **kwargs):
        material = request.GET.get("material", "").strip().lower()

        if not material:
            return Response(
                {"error": "Parámetro 'material' es requerido."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Obtener consolidado real (simulado)
        data = get_or_refresh_market_price(material)

        # Serializar de forma correcta
        serializer = MarketPriceSerializer(data=data)
        serializer.is_valid(raise_exception=True)

        return Response(serializer.validated_data, status=status.HTTP_200_OK)


# ============================================================
# 2. /market/ml/?material=cemento   (Legacy Dummy Endpoint)
# ============================================================


class MLPriceAPIView(APIView):
    """
    Endpoint de compatibilidad con el scraper de MercadoLibre.
    """

    def get(self, request, *args, **kwargs):
        material = request.GET.get("material", "").strip().lower()

        if not material:
            return Response(
                {"error": "Parámetro 'material' es requerido."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        data = get_ml_price(material)

        response = {
            "query": material,
            "market_avg": data["market_avg"],
            "market_min": data["market_min"],
            "market_max": data["market_max"],
            "sources": [data["source"]] if data["count"] > 0 else [],
            "updated_at": None,
        }

        return Response(response, status=status.HTTP_200_OK)


# ============================================================
# 3. /market/materials/   (Lista de materiales válidos)
# ============================================================


class MaterialListAPIView(APIView):
    """
    Devuelve una lista de materiales válidos para autocompletar y combos.
    """

    def get(self, request, *args, **kwargs):
        materials = MarketPrice.objects.all().order_by("material_name")

        serializer = MaterialSerializer(materials, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
