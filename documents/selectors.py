from django.shortcuts import get_object_or_404
from .models import Document


def get_documents_by_project(project_id: int):
    """
    Devuelve todos los documentos asociados a un proyecto.
    """
    return Document.objects.filter(project_id=project_id).order_by("-created_at")


def get_document_by_id(document_id: int):
    """
    Obtiene un documento por su ID o devuelve 404.
    """
    return get_object_or_404(Document, id=document_id)
