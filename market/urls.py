from django.urls import path
from .views import (
    MarketPriceAPIView,
    MLPriceAPIView,
    MaterialListAPIView,
)

urlpatterns = [
    # Precio consolidado PRO
    path("price/", MarketPriceAPIView.as_view(), name="market-price"),
    # Legacy (MercadoLibre dummy)
    path("ml/", MLPriceAPIView.as_view(), name="market-ml"),
    # Lista de materiales válidos
    path("materials/", MaterialListAPIView.as_view(), name="market-materials"),
]
