from django.urls import path
from .views import PurchaseListCreateView, PurchaseDetailView

urlpatterns = [
    path("", PurchaseListCreateView.as_view(), name="purchase-list-create"),
    path("<int:pk>/", PurchaseDetailView.as_view(), name="purchase-detail"),
]
