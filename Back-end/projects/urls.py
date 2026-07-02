from django.urls import path

from .views import (
    ProjectListCreateView,
    ProjectDetailView,
    ProjectKPIView,
    DashboardKPIView,
)

urlpatterns = [
    # ============================================================
    #   CRUD PRINCIPAL DE PROYECTOS
    # ============================================================
    path(
        "",
        ProjectListCreateView.as_view(),
        name="project-list",
    ),
    path(
        "<int:pk>/",
        ProjectDetailView.as_view(),
        name="project-detail",
    ),
    # ============================================================
    #   KPI POR PROYECTO
    #   GET /api/projects/<id>/kpi/
    # ============================================================
    path(
        "<int:pk>/kpi/",
        ProjectKPIView.as_view(),
        name="project-kpi",
    ),
    # ============================================================
    #   KPI GLOBAL (Admin / Supervisor)
    #   GET /api/projects/dashboard/kpi/
    # ============================================================
    path(
        "dashboard/kpi/",
        DashboardKPIView.as_view(),
        name="dashboard-kpi",
    ),
]
