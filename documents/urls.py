from django.urls import path

from .views import (
    DocumentListCreateView,
    DocumentDetailView,
    DocumentUploadView,
    DocumentVersionsView,
    DocumentHistoryView,
    DocumentDownloadView,  # 🔹 NUEVO
)

urlpatterns = [
    # ===========================
    #   🔵 ENDPOINTS LEGACY
    # ===========================
    path("", DocumentListCreateView.as_view(), name="documents-list-create"),
    path("<int:pk>/", DocumentDetailView.as_view(), name="documents-detail"),
    # ===========================
    #   🟩 CONTROL DOCUMENTAL PRO
    # ===========================
    # Subida PRO (versionado, duplicados, historial)
    path("upload/", DocumentUploadView.as_view(), name="documents-upload"),
    # Lista de versiones de un documento
    path(
        "<int:pk>/versions/",
        DocumentVersionsView.as_view(),
        name="documents-versions",
    ),
    # Historial funcional de un documento
    path(
        "<int:pk>/history/",
        DocumentHistoryView.as_view(),
        name="documents-history",
    ),
    # Descarga directa del archivo (forzar download)
    path(
        "<int:pk>/download/",
        DocumentDownloadView.as_view(),
        name="documents-download",
    ),
]
