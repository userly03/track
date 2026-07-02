from rest_framework import serializers

from .models import Document, DocumentHistory
from projects.models import Project
from . import services

ALLOWED_EXTENSIONS = ["pdf", "jpg", "jpeg", "png"]
MAX_FILE_SIZE_MB = 10


# ============================================================
# 🔹 VALIDACIÓN COMÚN DE ARCHIVO
# ============================================================


def _validate_file_basic(file):
    # 1. Extensión
    ext = file.name.split(".")[-1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise serializers.ValidationError(
            f"Extensión de archivo no permitida: .{ext}. Solo {ALLOWED_EXTENSIONS}"
        )

    # 2. Tamaño máximo
    if file.size > MAX_FILE_SIZE_MB * 1024 * 1024:
        raise serializers.ValidationError(
            f"El archivo excede el límite de {MAX_FILE_SIZE_MB}MB"
        )

    return file


# ============================================================
# 🔹 SERIALIZER PRINCIPAL DEL DOCUMENTO
# ============================================================


class DocumentSerializer(serializers.ModelSerializer):
    """
    Serializador principal para listar/detallar documentos.

    - Incluye metadata PRO.
    - Expone versión actual y estado de duplicado.
    - Incluye URLs y IDs relacionados de forma amigable al frontend.
    """

    fileUrl = serializers.SerializerMethodField()
    projectId = serializers.IntegerField(source="project.id", read_only=True)
    purchaseId = serializers.IntegerField(
        source="purchase.id", read_only=True, default=None
    )
    deliveryId = serializers.IntegerField(
        source="delivery.id", read_only=True, default=None
    )
    progressReportId = serializers.IntegerField(
        source="progress_report.id", read_only=True, default=None
    )

    originalDocumentId = serializers.SerializerMethodField()
    lastModifiedBy = serializers.CharField(
        source="last_modified_by.username", read_only=True, default=None
    )

    class Meta:
        model = Document
        fields = [
            "id",
            "projectId",
            "purchaseId",
            "deliveryId",
            "progressReportId",
            "title",
            "description",
            "file",
            "fileUrl",
            "status",
            "metadata",
            # CONTROL DOCUMENTAL PRO
            "version_number",
            "file_hash",
            "content_hash",
            "previous_hash",
            "is_duplicate",
            "originalDocumentId",
            # METADATA PRO
            "author",
            "document_type",
            "issue_date",
            "responsible_area",
            "sensitivity_level",
            # Auditoría
            "lastModifiedBy",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "version_number",
            "file_hash",
            "content_hash",
            "previous_hash",
            "is_duplicate",
            "originalDocumentId",
            "lastModifiedBy",
            "created_at",
            "updated_at",
        ]

    # --- URL pública del archivo ---
    def get_fileUrl(self, obj):
        if obj.file:
            try:
                return obj.file.url
            except ValueError:
                return None
        return None

    def get_originalDocumentId(self, obj):
        return obj.original_document_id

    # ------- VALIDACIONES --------
    def validate_file(self, file):
        return _validate_file_basic(file)

    def create(self, validated_data):
        """
        ⚠️ Uso básico (no recomendado para versión PRO).
        El flujo completo de versionado / duplicados debe ir por:
        - endpoint POST /api/documents/upload/
        - serializer: DocumentUploadSerializer

        Este create mantiene compatibilidad mínima.
        """
        request = self.context.get("request")
        user = request.user if request and request.user.is_authenticated else None

        doc = Document.objects.create(
            **validated_data,
            uploaded_by=user,
            updated_by=user,
            last_modified_by=user,
        )

        return doc

    def update(self, instance, validated_data):
        """
        Actualiza campos del documento.
        El modelo se encarga de recalcular hashes en .save().
        """
        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        # Setear usuario actual si se pasa por contexto
        request = self.context.get("request")
        if request and hasattr(request, "user"):
            instance.last_modified_by = request.user

        request = self.context.get("request")
        user = request.user if request and request.user.is_authenticated else None

        instance.last_modified_by = user
        instance.updated_by = user

        instance.save()
        return instance


# ============================================================
# 🔹 SERIALIZER PARA SUBIDA PRO DE DOCUMENTOS
# ============================================================


class DocumentUploadSerializer(serializers.Serializer):
    """
    Serializer específico para el endpoint:

        POST /api/documents/upload/

    Dispara toda la lógica PRO:
    - versionado automático
    - detección de duplicados
    - historial (DocumentHistory)
    - integración con alerts + history
    """

    projectId = serializers.IntegerField()
    title = serializers.CharField(max_length=200)
    description = serializers.CharField(required=False, allow_blank=True)
    file = serializers.FileField()

    metadata = serializers.JSONField(required=False)
    author = serializers.CharField(required=False, allow_blank=True)
    document_type = serializers.CharField(required=False, allow_blank=True)
    issue_date = serializers.DateField(required=False, allow_null=True)
    responsible_area = serializers.CharField(required=False, allow_blank=True)
    sensitivity_level = serializers.CharField(
        required=False, allow_blank=True, default="low"
    )

    def validate_file(self, file):
        return _validate_file_basic(file)

    def validate_projectId(self, value):
        if not Project.objects.filter(id=value).exists():
            raise serializers.ValidationError("Proyecto no encontrado.")
        return value

    def create(self, validated_data):
        project_id = validated_data.pop("projectId")
        project = Project.objects.get(id=project_id)

        file = validated_data.pop("file")
        metadata = validated_data.pop("metadata", {}) or {}

        request = self.context.get("request")
        user = getattr(request, "user", None) if request else None

        doc = services.process_document_upload(
            project=project,
            file=file,
            title=validated_data.get("title", ""),
            description=validated_data.get("description", ""),
            metadata=metadata,
            author=validated_data.get("author", ""),
            document_type=validated_data.get("document_type", ""),
            issue_date=validated_data.get("issue_date"),
            responsible_area=validated_data.get("responsible_area", ""),
            sensitivity_level=validated_data.get("sensitivity_level", "low"),
            user=user,
        )
        return doc


# ============================================================
# 🔹 SERIALIZER DE HISTORIAL DE DOCUMENTOS
# ============================================================


class DocumentHistorySerializer(serializers.ModelSerializer):
    """
    Serializa las entradas de historial funcional del documento.
    Ideal para un endpoint tipo:
        GET /api/documents/<id>/history/
    """

    performedBy = serializers.CharField(
        source="performed_by.username", read_only=True, default=None
    )

    class Meta:
        model = DocumentHistory
        fields = [
            "id",
            "document",
            "version_number",
            "file_hash",
            "content_hash",
            "previous_hash",
            "event_type",
            "performedBy",
            "comment",
            "metadata_snapshot",
            "created_at",
        ]


# ============================================================
# 🔹 SERIALIZER PARA LISTA DE VERSIONES (ENDPOINT /versions/)
# ============================================================


class DocumentVersionEntrySerializer(serializers.Serializer):
    version = serializers.IntegerField()
    hash = serializers.CharField()
    created_at = serializers.DateTimeField()


class DocumentVersionsSerializer(serializers.Serializer):
    """
    Estructura de respuesta para:

        GET /api/documents/<id>/versions/

    Ejemplo:
    {
        "document_id": 44,
        "current_version": 5,
        "versions": [
            { "version": 1, "hash": "..." },
            ...
        ]
    }
    """

    document_id = serializers.IntegerField()
    current_version = serializers.IntegerField()
    versions = DocumentVersionEntrySerializer(many=True)
