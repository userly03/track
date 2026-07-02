from rest_framework import generics
from rest_framework.response import Response
from rest_framework.exceptions import NotFound, ValidationError

from .models import HistoryRecord, ChangeRecord
from .serializers import HistoryRecordSerializer, ChangeRecordSerializer
from .selectors import (
    list_all_history,
    get_history_by_project,
    get_history_for_instance,
)


# ======================================================
# 🔵 LISTA GENERAL DE HISTORY (YA EXISTENTE)
# ======================================================


class HistoryListView(generics.ListAPIView):
    """
    GET /history/
    Lista de auditoría general (acciones).
    """

    serializer_class = HistoryRecordSerializer

    def get_queryset(self):
        limit = self.request.query_params.get("limit")
        if limit is not None:
            try:
                limit = int(limit)
            except ValueError:
                raise ValidationError("limit debe ser un número entero.")
        return list_all_history(limit)


# ======================================================
# 🔵 DETALLE DE REGISTRO INDIVIDUAL (YA EXISTENTE)
# ======================================================


class HistoryDetailView(generics.RetrieveAPIView):
    """
    GET /history/<id>/
    """

    queryset = HistoryRecord.objects.select_related("user", "project")
    serializer_class = HistoryRecordSerializer
    lookup_field = "id"


# ======================================================
# 🔵 HISTORIAL POR PROYECTO (YA EXISTENTE)
# ======================================================


class HistoryByProjectView(generics.ListAPIView):
    """
    GET /history/project/<project_id>/
    """

    serializer_class = HistoryRecordSerializer

    def get_queryset(self):
        project_id = self.kwargs.get("project_id")
        if not project_id:
            raise ValidationError("project_id es requerido")

        limit = self.request.query_params.get("limit")
        if limit is not None:
            try:
                limit = int(limit)
            except ValueError:
                raise ValidationError("limit debe ser un entero")

        return get_history_by_project(project_id, limit)


# ======================================================
# 🔵 HISTORIAL DE UNA ENTIDAD ESPECÍFICA (YA EXISTENTE)
# ======================================================


class HistoryByEntityView(generics.ListAPIView):
    """
    GET /history/entity/<related_type>/<related_id>/
    """

    serializer_class = HistoryRecordSerializer

    def get_queryset(self):
        related_type = self.kwargs.get("related_type")
        related_id = self.kwargs.get("related_id")

        if not related_type or not related_id:
            raise ValidationError("related_type y related_id son requeridos")

        limit = self.request.query_params.get("limit")
        if limit is not None:
            try:
                limit = int(limit)
            except ValueError:
                raise ValidationError("limit debe ser un entero")

        qs = get_history_for_instance(
            related_type=str(related_type).lower(),
            related_id=str(related_id),
            limit=limit,
        )

        if qs.count() == 0:
            raise NotFound("No existe historial para esa entidad.")

        return qs


# ======================================================
# 🔥 NUEVO — LISTA GLOBAL DE CAMBIOS DETALLADOS (ChangeRecord)
# ======================================================


class ChangeRecordListView(generics.ListAPIView):
    """
    GET /history/changes/
    Lista todos los cambios campo-por-campo.
    """

    queryset = ChangeRecord.objects.select_related("changed_by")
    serializer_class = ChangeRecordSerializer
    ordering = ("-timestamp",)


# ======================================================
# 🔥 NUEVO — CAMBIOS POR ENTIDAD
# ======================================================


class ChangeRecordByEntityView(generics.ListAPIView):
    """
    GET /history/changes/entity/<model_name>/<object_id>/
    Ejemplo:
        /history/changes/entity/purchase/20/
    """

    serializer_class = ChangeRecordSerializer

    def get_queryset(self):
        model_name = self.kwargs.get("model_name")
        object_id = self.kwargs.get("object_id")

        if not model_name or not object_id:
            raise ValidationError("model_name y object_id son requeridos.")

        qs = ChangeRecord.objects.filter(
            model_name=str(model_name).lower(), object_id=str(object_id)
        ).order_by("-timestamp")

        if qs.count() == 0:
            raise NotFound("No hay cambios para esa entidad.")

        return qs


# ======================================================
# 🔥 NUEVO — CAMBIOS POR PROYECTO (FULL AUDIT)
# ======================================================


class ChangeRecordByProjectView(generics.ListAPIView):
    """
    GET /history/changes/project/<project_id>/
    Filtra todos los ChangeRecord cuyo HistoryRecord esté vinculado al proyecto.
    """

    serializer_class = ChangeRecordSerializer

    def get_queryset(self):
        project_id = self.kwargs.get("project_id")
        if not project_id:
            raise ValidationError("project_id es requerido.")

        # Tomamos IDs de entidades del proyecto desde HistoryRecord
        related_ids = HistoryRecord.objects.filter(project_id=project_id).values_list(
            "related_id", flat=True
        )

        qs = ChangeRecord.objects.filter(object_id__in=related_ids)

        if qs.count() == 0:
            raise NotFound("No hay cambios asociados a este proyecto.")

        return qs.order_by("-timestamp")
