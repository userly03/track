import hashlib
from typing import Optional

from django.db import transaction

from .models import Document, DocumentHistory
from trackbuild.utils.hashing import generate_sha256_hash

# Alertas existentes (viene de Fase 8)
from alerts.services import (
    check_document_integrity as alerts_check_document_integrity,
    check_data_manipulation,
    check_missing_documents as alerts_check_missing_documents,
)

from history.services import log_action


# ============================================================
# 🟩 GENERAR HASH SHA256 DE ARCHIVO
# ============================================================


def calculate_file_hash(file_obj) -> str:
    """
    Calcula SHA256 y reinicia el puntero del archivo.
    """
    sha256 = hashlib.sha256()

    for chunk in file_obj.chunks():
        sha256.update(chunk)

    # 🔥 IMPORTANTE
    file_obj.seek(0)

    return sha256.hexdigest()


# ============================================================
# 🟦 GENERAR HASH DE CONTENIDO DEL DOCUMENTO
# ============================================================


def generate_document_hash(document: Document) -> str:
    """
    Genera hash interno del documento basado en todos sus campos relevantes,
    no del archivo físico.
    """
    payload = {
        "id": document.id,
        "project_id": document.project_id,
        "title": document.title,
        "description": document.description,
        "metadata": document.metadata,
        "file_hash": document.file_hash,
        "previous_hash": document.previous_hash,
        "version_number": document.version_number,
        "status": document.status,
        "author": document.author,
        "document_type": document.document_type,
        "issue_date": str(document.issue_date) if document.issue_date else None,
        "responsible_area": document.responsible_area,
        "sensitivity_level": document.sensitivity_level,
        "created_at": str(document.created_at),
        "updated_at": str(document.updated_at),
    }
    return generate_sha256_hash(payload)


# ============================================================
# 🟥 DETECCIÓN DE DUPLICADOS (mismo file_hash)
# ============================================================


def detect_duplicate(project, file_hash: str) -> Optional[Document]:
    """
    Busca si existe otro documento dentro del mismo proyecto cuyo 'file_hash'
    sea idéntico. Si existe → es duplicado.
    """
    return Document.objects.filter(project=project, file_hash=file_hash).first()


# ============================================================
# 🟨 CREAR NUEVA VERSIÓN
# ============================================================


def create_new_version(document: Document, user=None) -> Document:
    """
    Genera una nueva versión del documento.
    Crea un NUEVO registro en lugar de modificar el existente
    """
    from django.core.files.base import ContentFile
    
    # Crear un nuevo documento con versión incrementada
    new_doc = Document.objects.create(
        project=document.project,
        purchase=document.purchase,
        delivery=document.delivery,
        progress_report=document.progress_report,
        title=document.title,
        description=document.description,
        metadata=document.metadata.copy(),
        author=document.author,
        document_type=document.document_type,
        issue_date=document.issue_date,
        responsible_area=document.responsible_area,
        sensitivity_level=document.sensitivity_level,
        status=document.status,
        version_number=document.version_number + 1,
        original_hash=document.original_hash or document.file_hash,
        previous_hash=document.content_hash,
        uploaded_by=document.uploaded_by,
        updated_by=user,
        last_modified_by=user,
    )
    
    # Copiar el archivo físico
    if document.file:
        with document.file.open('rb') as f:
            new_doc.file.save(document.file.name, ContentFile(f.read()), save=False)
    
    new_doc.save()
    
    # Registrar historial
    DocumentHistory.objects.create(
        document=new_doc,
        version_number=new_doc.version_number,
        file_hash=new_doc.file_hash,
        content_hash=new_doc.content_hash,
        previous_hash=new_doc.previous_hash,
        event_type="version_created",
        performed_by=user,
        metadata_snapshot=new_doc.metadata,
        comment=f"Nueva versión generada (v{new_doc.version_number}).",
    )
    
    log_action(
        action_type="document_version_created",
        user=user,
        instance_before=document,
        instance_after=new_doc,
        project=new_doc.project,
        metadata={"version": new_doc.version_number},
    )
    
    return new_doc

# ============================================================
# 🟦 PROCESAR SUBIDA DE DOCUMENTO (VÍA VIEW)
# ============================================================


@transaction.atomic
def process_document_upload(
    *,
    project,
    file,
    title: str,
    description: str = "",
    metadata: dict = None,
    author: str = "",
    document_type: str = "",
    issue_date=None,
    responsible_area: str = "",
    sensitivity_level: str = "low",
    user=None,
) -> Document:
    """
    Lógica completa de creación/documento versión PRO.

    Flujo:
    1. Calcular file_hash del archivo subido.
    2. Buscar duplicados exactos.
    3. Buscar documentos con mismo título -> crear versión nueva.
    4. Crear Document / versión nueva.
    5. Registrar en DocumentHistory.
    6. Ejecutar motor de alertas (fase 8).
    """

    metadata = metadata or {}

    # 1. Hash del archivo
    file_hash = calculate_file_hash(file)

    # 2. Si existe duplicado → no crear nuevo documento
    duplicate = detect_duplicate(project, file_hash)
    if duplicate:
        duplicate.is_duplicate = True
        duplicate._current_user = user
        duplicate.save()

        # Registrar historial del duplicado
        DocumentHistory.objects.create(
            document=duplicate,
            version_number=duplicate.version_number,
            file_hash=duplicate.file_hash,
            content_hash=duplicate.content_hash,
            previous_hash=duplicate.previous_hash,
            event_type="duplicate_detected",
            performed_by=user,
            metadata_snapshot=duplicate.metadata,
            comment="Documento duplicado detectado.",
        )

        # Auditoría global
        log_action(
            action_type="duplicate_document_detected",
            user=user,
            instance_before=None,
            instance_after=duplicate,
            project=project,
            metadata={"file_hash": file_hash},
        )

        return duplicate

    # 3. Buscar si existe documento con mismo título → crear versión
    existing = (
        Document.objects.filter(project=project, title=title)
        .order_by("-version_number")
        .first()
    )

    if existing:
        # Crear nueva versión (NO modificar el existing)
        new_doc = Document.objects.create(
            project=project,
            title=title,
            description=description,
            file=file,
            file_hash=file_hash,
            original_hash=existing.original_hash or existing.file_hash,
            previous_hash=existing.content_hash,
            metadata=metadata,
            author=author,
            document_type=document_type,
            issue_date=issue_date,
            responsible_area=responsible_area,
            sensitivity_level=sensitivity_level,
            version_number=existing.version_number + 1,
            last_modified_by=user,
            uploaded_by=existing.uploaded_by,
            updated_by=user,
        )
        
        DocumentHistory.objects.create(
            document=new_doc,
            version_number=new_doc.version_number,
            file_hash=new_doc.file_hash,
            content_hash=new_doc.content_hash,
            previous_hash=new_doc.previous_hash,
            event_type="version_created",
            performed_by=user,
            metadata_snapshot=new_doc.metadata,
            comment=f"Versión {new_doc.version_number} creada",
        )
        
        return new_doc

    # 4. Crear documento inicial
    new_doc = Document.objects.create(
        project=project,
        title=title,
        description=description,
        file=file,
        file_hash=file_hash,
        original_hash=file_hash,
        metadata=metadata,
        author=author,
        document_type=document_type,
        issue_date=issue_date,
        responsible_area=responsible_area,
        sensitivity_level=sensitivity_level,
        last_modified_by=user,
        uploaded_by=user,
        updated_by=user,
    )

    # 5. Registrar historial inicial
    DocumentHistory.objects.create(
        document=new_doc,
        version_number=new_doc.version_number,
        file_hash=new_doc.file_hash,
        content_hash=new_doc.content_hash,
        previous_hash=new_doc.previous_hash,
        event_type="created",
        performed_by=user,
        metadata_snapshot=new_doc.metadata,
        comment="Documento creado.",
    )

    # 6. Ejecutar motor de alertas
    alerts_check_document_integrity(new_doc)
    check_data_manipulation(new_doc)

    log_action(
        action_type="document_created",
        user=user,
        instance_before=None,
        instance_after=new_doc,
        project=project,
        metadata={"title": title},
    )

    return new_doc


# ============================================================
# 🔵 ALERTAS POR PROYECTO
# ============================================================


def evaluate_project_documents_for_alerts(project):
    alerts_check_missing_documents(project)


# ============================================================
# 🔵 COMPATIBILIDAD LEGADA
# ============================================================


def check_missing_documents(project):
    alerts_check_missing_documents(project)


def check_document_integrity(document):
    alerts_check_document_integrity(document)


from .models import Document
from alerts.services import (
    check_document_integrity as alerts_check_document_integrity,
    check_data_manipulation,
)
from history.services import log_action


def evaluate_document_for_alerts(document: Document):
    """
    Evalúa integridad + manipulación (fase 8)
    y registra auditoría (fase 9).
    """
    before = Document.objects.get(id=document.id)

    # Motor de alertas
    alerts_check_document_integrity(document)
    check_data_manipulation(document)

    # Auditoría History
    log_action(
        action_type="document_alerts_evaluated",
        user=getattr(document, "_current_user", None),
        instance_before=before,
        instance_after=document,
        project=document.project,
        metadata={"alert_engine": "integrity + manipulation"},
    )


from history.services import log_action, record_field_changes


def update_document(instance, data, user=None, reason=None):
    """
    Actualización PRO de Document con auditoría avanzada.
    - Captura BEFORE
    - Aplica cambios enviados en 'data'
    - Captura AFTER
    - Genera ChangeRecord por cada campo modificado
    - Registra HistoryRecord global
    """

    # BEFORE snapshot
    before = instance.__class__.objects.get(pk=instance.pk)

    # Aplicar cambios dinámicos
    for field, value in data.items():
        setattr(instance, field, value)

    instance.save()

    # AFTER snapshot
    after = instance.__class__.objects.get(pk=instance.pk)

    # Auditoría detallada campo por campo
    record_field_changes(
        instance_before=before,
        instance_after=after,
        user=user,
        reason=reason,
    )

    # Auditoría general del evento
    log_action(
        action_type="document_updated",
        user=user,
        instance_before=before,
        instance_after=after,
        project=getattr(instance, "project", None),
        metadata={"reason": reason} if reason else {},
    )

    return instance
