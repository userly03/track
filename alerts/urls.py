from django.urls import path
from .views import (
    AlertListView,
    AlertDetailView,
    AlertResolveView,
)

urlpatterns = [
    path("", AlertListView.as_view(), name="alerts-list"),
    path("<int:pk>/", AlertDetailView.as_view(), name="alerts-detail"),
    path("<int:pk>/resolve/", AlertResolveView.as_view(), name="alerts-resolve"),
]
