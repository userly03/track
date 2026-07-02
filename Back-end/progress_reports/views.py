from rest_framework import generics, status
from rest_framework.response import Response

from .models import ProgressReport
from .serializers import ProgressReportSerializer
from .selectors import (
    get_progress_by_id,
    get_progress_by_project,
)
from .services import (
    update_progress_hash,
    evaluate_progress_for_alerts,
)

# 🟢 Auditoría History
from history.services import log_action
from users.permissions import IsAdminOrReadOnly


class ProgressReportListCreateView(generics.ListCreateAPIView):
    serializer_class = ProgressReportSerializer
    permission_classes = [IsAdminOrReadOnly]

    def get_queryset(self):
        project_id = self.request.query_params.get("projectId")
        if project_id:
            qs = get_progress_by_project(project_id)
            return qs or ProgressReport.objects.none()
        return ProgressReport.objects.all().select_related("project")

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        progress_report = serializer.save()

        # 🟢 HISTORY: creación
        user = request.user if request.user.is_authenticated else None

        log_action(
            action_type="progress_created",
            user=user,
            instance_before=None,
            instance_after=progress_report,
            project=progress_report.project,
            metadata={"endpoint": "POST /api/progress/"},
        )

        # 🟦 Hash
        update_progress_hash(progress_report)

        # 🚨 Alertas avanzadas
        evaluate_progress_for_alerts(progress_report)

        return Response(
            self.get_serializer(progress_report).data,
            status=status.HTTP_201_CREATED,
        )


class ProgressReportDetailView(generics.RetrieveUpdateAPIView):
    serializer_class = ProgressReportSerializer
    permission_classes = [IsAdminOrReadOnly]

    def get_object(self):
        progress_id = self.kwargs.get("id")
        obj = get_progress_by_id(progress_id)
        from rest_framework.exceptions import NotFound

        if obj is None:
            raise NotFound("El avance no existe.")
        return obj

    def update(self, request, *args, **kwargs):
        instance = self.get_object()

        # 🟡 BEFORE
        before = ProgressReport.objects.get(id=instance.id)

        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)

        progress_report = serializer.save()

        # 🟢 HISTORY: actualización
        user = request.user if request.user.is_authenticated else None

        log_action(
            action_type="progress_updated",
            user=user,
            instance_before=before,
            instance_after=progress_report,
            project=progress_report.project,
            metadata={"endpoint": "PUT/PATCH /api/progress/<id>/"},
        )

        # 🟦 Hash
        update_progress_hash(progress_report)

        # 🚨 Alertas
        evaluate_progress_for_alerts(progress_report)

        return Response(self.get_serializer(progress_report).data)
