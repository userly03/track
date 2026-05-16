from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import Document
from .services import (
    evaluate_document_for_alerts,
    evaluate_project_documents_for_alerts,
)


@receiver(post_save, sender=Document)
def document_post_save(sender, instance, created, **kwargs):
    """
    Eventos automáticos después de guardar un Document:

    ✔ Ejecuta el motor de alertas de integridad y manipulación.
    ✔ Evalúa documentos faltantes a nivel de proyecto.

    NOTA:
    - El cálculo de hashes (file_hash, content_hash, previous_hash)
      se realiza dentro de Document.save(), no aquí.
    """
    # Alertas de integridad + manipulación sobre el documento
    evaluate_document_for_alerts(instance)

    # Alertas de documentos faltantes por proyecto
    evaluate_project_documents_for_alerts(instance.project)
