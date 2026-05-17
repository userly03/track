from .models import ProgressReport
from projects.models import Project
from django.core.exceptions import ObjectDoesNotExist


def get_progress_by_id(progress_id: int):
    """
    Retorna un avance por ID, optimizado con select_related.
    """
    try:
        return ProgressReport.objects.select_related("project").get(id=progress_id)
    except ProgressReport.DoesNotExist:
        return None


def get_progress_by_project(project_id: int):
    """
    Retorna todos los avances de un proyecto específico.
    """
    try:
        project = Project.objects.get(id=project_id)
    except Project.DoesNotExist:
        return None

    return (
        ProgressReport.objects.filter(project=project)
        .select_related("project")
        .order_by("-date", "-created_at")
    )
