from django.urls import path

from .views import (
    # HISTORY RECORDS
    HistoryListView,
    HistoryDetailView,
    HistoryByProjectView,
    HistoryByEntityView,
    # CHANGE RECORDS (Auditoría PRO)
    ChangeRecordListView,
    ChangeRecordByEntityView,
    ChangeRecordByProjectView,
)

urlpatterns = [
    # ======================================================
    # 🔵 HISTORY RECORD — Auditoría de acciones
    # ======================================================
    # Lista general
    path("", HistoryListView.as_view(), name="history-list"),
    # Detalle por ID
    path("<int:id>/", HistoryDetailView.as_view(), name="history-detail"),
    # Historial por proyecto
    path(
        "project/<int:project_id>/",
        HistoryByProjectView.as_view(),
        name="history-by-project",
    ),
    # Historial por tipo + ID (compra, entrega, documento, etc.)
    path(
        "entity/<str:related_type>/<str:related_id>/",
        HistoryByEntityView.as_view(),
        name="history-by-entity",
    ),
    # ======================================================
    # 🔥 CHANGE RECORD — Auditoría detallada PRO
    # ======================================================
    # Listado global de cambios campo por campo
    path(
        "changes/",
        ChangeRecordListView.as_view(),
        name="change-record-list",
    ),
    # Cambios específicos de <modelo>/<id>
    path(
        "changes/entity/<str:model_name>/<str:object_id>/",
        ChangeRecordByEntityView.as_view(),
        name="change-record-by-entity",
    ),
    # Cambios aplicados dentro de un proyecto
    path(
        "changes/project/<int:project_id>/",
        ChangeRecordByProjectView.as_view(),
        name="change-record-by-project",
    ),
]
