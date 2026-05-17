from django.urls import path
from .views import (
    ProgressReportListCreateView,
    ProgressReportDetailView,
)

urlpatterns = [
    path("", ProgressReportListCreateView.as_view(), name="progress-list-create"),
    path("<int:id>/", ProgressReportDetailView.as_view(), name="progress-detail"),
]
