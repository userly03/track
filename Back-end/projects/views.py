from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.exceptions import ValidationError

from .models import Project
from .serializers import (
    ProjectSerializer,
    ProjectKPISerializer,
)
from .selectors import get_all_projects, get_project_by_id
from alerts.services import check_project_delay
from .services import (
    get_project_kpi,
    get_all_projects_kpi,
)

from history.services import log_action
from users.permissions import IsAdminOrReadOnly


# ============================================================
#   LIST + CREATE  (/api/projects/)
# ============================================================


class ProjectListCreateView(generics.ListCreateAPIView):
    """
    ENDPOINTS:
        GET  /api/projects/   → Lista todos los proyectos
        POST /api/projects/   → Crea un nuevo proyecto

    Características:
    - Usa selectors (test-friendly)
    - Registra auditoría en History
    - Verifica retraso para siguientes fases de alertas
    """

    serializer_class = ProjectSerializer
    permission_classes = [IsAdminOrReadOnly]

    def get_serializer_context(self):
        return {"request": self.request}

    def get_queryset(self):
        return get_all_projects()

    def perform_create(self, serializer):
        request = getattr(self, "request", None)

        project = serializer.save()

        user = request.user if request and request.user.is_authenticated else None

        log_action(
            action_type="project_created",
            user=user,
            instance_before=None,
            instance_after=project,
            project=project,
            metadata={
                "endpoint": "POST /api/projects/",
                "client": str(request.META.get("REMOTE_ADDR", "")) if request else "",
            },
        )

        # Validación de retraso (futuro → alertas)
        check_project_delay(project)

        return project


# ============================================================
#   RETRIEVE + UPDATE  (/api/projects/<id>/)
# ============================================================


class ProjectDetailView(generics.RetrieveUpdateAPIView):
    """
    ENDPOINTS:
        GET    /api/projects/<id>/
        PUT    /api/projects/<id>/
        PATCH  /api/projects/<id>/

    Características:
    - Selección centralizada del proyecto
    - Auditoría completa de cambios
    - Lógica de retraso aplicada después de actualizar
    """

    serializer_class = ProjectSerializer
    permission_classes = [IsAdminOrReadOnly]

    def get_serializer_context(self):
        return {"request": self.request}

    def get_queryset(self):
        # DRF requiere queryset base, aunque get_object sea custom
        return Project.objects.all()

    def get_object(self):
        project = get_project_by_id(self.kwargs["pk"])
        if not project:
            raise ValidationError("El proyecto no existe.")
        return project

    def perform_update(self, serializer):
        before = Project.objects.get(pk=self.kwargs["pk"])
        request = getattr(self, "request", None)

        project = serializer.save()  # updated_by ya se guarda en serializer

        user = request.user if request and request.user.is_authenticated else None

        log_action(
            action_type="project_updated",
            user=user,
            instance_before=before,
            instance_after=project,
            project=project,
            metadata={
                "endpoint": "PUT/PATCH /api/projects/<id>/",
                "client": str(request.META.get("REMOTE_ADDR", "")) if request else "",
            },
        )

        # Validación de retraso
        check_project_delay(project)

        return project


# ============================================================
#   KPI POR PROYECTO  (/api/projects/<id>/kpi/)
# ============================================================


class ProjectKPIView(APIView):
    """
    ENDPOINT:
        GET /api/projects/<id>/kpi/

    Devuelve:
    - Avance físico
    - Avance financiero
    - Balance de materiales
    - Retraso en días
    - Alertas activas por severidad
    - Riesgo global
    - Integridad (hash)
    - Consistencia entre módulos
    """

    def get(self, request, pk: int):
        project = get_project_by_id(pk)
        if not project:
            raise ValidationError("El proyecto no existe.")

        data = get_project_kpi(pk)
        serializer = ProjectKPISerializer(data)

        # Auditoría opcional (información)
        log_action(
            action_type="project_kpi_viewed",
            user=request.user if request.user.is_authenticated else None,
            instance_before=project,
            instance_after=project,
            project=project,
            metadata={"endpoint": f"GET /api/projects/{pk}/kpi/"},
        )

        return Response(serializer.data, status=status.HTTP_200_OK)


# ============================================================
#   KPI GLOBAL (ADMIN / SUPERVISOR)  (/api/dashboard/kpi/)
# ============================================================


class DashboardKPIView(APIView):

    def get(self, request):
        kpis = get_all_projects_kpi()

        log_action(
            action_type="dashboard_kpi_viewed",
            user=request.user if request.user.is_authenticated else None,
            instance_before=None,
            instance_after=None,
            metadata={"endpoint": "GET /api/dashboard/kpi/"},
        )

        return Response(kpis, status=status.HTTP_200_OK)
