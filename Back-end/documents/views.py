from django.http import FileResponse, Http404
import os

from rest_framework import generics, status
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Document, DocumentHistory
from .serializers import (
    DocumentSerializer,
    DocumentUploadSerializer,
    DocumentVersionsSerializer,
    DocumentHistorySerializer,
)
from .selectors import get_documents_by_project, get_document_by_id

# Motor PRO
from .services import process_document_upload

# Auditoría global
from history.services import log_action
from users.permissions import IsAdminOrReadOnly


# ============================================================
# 🔵 LISTAR DOCUMENTOS / CREAR DOCUMENTOS (LEGACY)
# ============================================================


class DocumentListCreateView(generics.ListCreateAPIView):
    """
    Endpoint de compatibilidad.
    Para el flujo PRO usar:
        POST /api/documents/upload/
    """

    queryset = Document.objects.all()
    serializer_class = DocumentSerializer
    permission_classes = [IsAdminOrReadOnly]
    parser_classes = (MultiPartParser, FormParser)

    def get_queryset(self):
        project_id = self.request.query_params.get("projectId")
        if project_id:
            return get_documents_by_project(project_id)
        return Document.objects.all()

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        document = serializer.save()

        # Auditoría
        user = request.user if request.user.is_authenticated else None
        log_action(
            action_type="document_created_legacy",
            user=user,
            instance_before=None,
            instance_after=document,
            project=document.project,
            metadata={"endpoint": "POST /api/documents/"},
        )

        return Response(
            DocumentSerializer(document).data,
            status=status.HTTP_201_CREATED,
        )


# ============================================================
# 🔵 DETALLE / UPDATE / DELETE DOCUMENTO
# ============================================================


class DocumentDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Document.objects.all()
    serializer_class = DocumentSerializer
    permission_classes = [IsAdminOrReadOnly]
    parser_classes = (MultiPartParser, FormParser, JSONParser)

    def get_object(self):
        return get_document_by_id(self.kwargs.get("pk"))

    def put(self, request, *args, **kwargs):
        instance = self.get_object()
        before = Document.objects.get(id=instance.id)

        serializer = self.get_serializer(instance, data=request.data, partial=False)
        serializer.is_valid(raise_exception=True)
        request = self.request
        user = request.user if request.user.is_authenticated else None
        if user:
            instance.updated_by = user
            instance.last_modified_by = user

        instance = serializer.save()

        user = request.user if request.user.is_authenticated else None
        log_action(
            action_type="document_updated",
            user=user,
            instance_before=before,
            instance_after=instance,
            project=instance.project,
            metadata={"endpoint": "PUT /api/documents/<id>/"},
        )

        return Response(DocumentSerializer(instance).data)

    def patch(self, request, *args, **kwargs):
        instance = self.get_object()
        before = Document.objects.get(id=instance.id)

        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        request = self.request
        user = request.user if request.user.is_authenticated else None
        if user:
            instance.updated_by = user
            instance.last_modified_by = user

        instance = serializer.save()

        user = request.user if request.user.is_authenticated else None
        log_action(
            action_type="document_updated_partial",
            user=user,
            instance_before=before,
            instance_after=instance,
            project=instance.project,
            metadata={"endpoint": "PATCH /api/documents/<id>/"},
        )

        return Response(DocumentSerializer(instance).data)


# ============================================================
# 🟩 ENDPOINT PRO: SUBIDA DE DOCUMENTOS
# ============================================================


class DocumentUploadView(APIView):
    parser_classes = (MultiPartParser, FormParser)
    permission_classes = [IsAdminOrReadOnly]

    def post(self, request):
        serializer = DocumentUploadSerializer(
            data=request.data,
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)

        document = serializer.save()

        return Response(
            DocumentSerializer(document).data,
            status=status.HTTP_201_CREATED,
        )


# ============================================================
# 🟨 ENDPOINT PRO: LISTA DE VERSIONES
# ============================================================


class DocumentVersionsView(APIView):
    permission_classes = [IsAdminOrReadOnly]

    def get(self, request, pk):
        doc = get_document_by_id(pk)

        versions = Document.objects.filter(
            project=doc.project, title=doc.title
        ).order_by("version_number")

        data = {
            "document_id": doc.id,
            "current_version": doc.version_number,
            "versions": [
                {
                    "version": d.version_number,
                    "hash": d.content_hash,
                    "created_at": d.created_at,
                }
                for d in versions
            ],
        }

        serializer = DocumentVersionsSerializer(data)
        return Response(serializer.data)


# ============================================================
# 🟧 ENDPOINT PRO: HISTORIAL DEL DOCUMENTO
# ============================================================


class DocumentHistoryView(generics.ListAPIView):
    serializer_class = DocumentHistorySerializer
    permission_classes = [IsAdminOrReadOnly]

    def get_queryset(self):
        document_id = self.kwargs.get("pk")
        return DocumentHistory.objects.filter(document_id=document_id).order_by(
            "-version_number", "-created_at"
        )


# ============================================================
# 🟥 ENDPOINT PRO: DESCARGA DIRECTA DEL ARCHIVO
# ============================================================


class DocumentDownloadView(APIView):
    """
    Devuelve el archivo físico del documento como descarga.

    GET /api/documents/<id>/download/
    """

    permission_classes = [IsAdminOrReadOnly]

    def get(self, request, pk):
        doc = get_document_by_id(pk)

        if not doc.file:
            raise Http404("Archivo no encontrado")

        # Ruta física del archivo
        file_path = doc.file.path
        file_name = os.path.basename(file_path)

        # FileResponse fuerza la descarga si as_attachment=True
        return FileResponse(
            open(file_path, "rb"),
            as_attachment=True,
            filename=file_name,
        )
