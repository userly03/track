from django.urls import path

from .views import (
    ProjectReportPDFView,
    AlertReportPDFView,
    FinancialReportPDFView,
)

urlpatterns = [
    # -------------------------
    # REPORTES PRINCIPALES
    # -------------------------
    path(
        "project/<int:project_id>/pdf/",
        ProjectReportPDFView.as_view(),
        name="project-report-pdf",
    ),
    path(
        "alerts/<int:project_id>/pdf/",
        AlertReportPDFView.as_view(),
        name="alerts-report-pdf",
    ),
    path(
        "financial/<int:project_id>/pdf/",
        FinancialReportPDFView.as_view(),
        name="financial-report-pdf",
    ),
]
