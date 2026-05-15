from typing import Optional
from django.db.models import QuerySet
from django.utils import timezone

from .models import Project


# ============================================================
#   SELECTOR BASE (GET ALL)
# ============================================================


def get_all_projects() -> QuerySet[Project]:
    """
    Retorna todos los proyectos ordenados por fecha de creación.
    """
    return Project.objects.all().order_by("-created_at")


# ============================================================
#   SELECTOR POR ID
# ============================================================


def get_project_by_id(project_id: int) -> Optional[Project]:
    """
    Retorna un proyecto o None.
    """
    try:
        return Project.objects.get(id=project_id)
    except Project.DoesNotExist:
        return None


# ============================================================
#   SELECTOR AVANZADO
# ============================================================


def get_projects_filtered(
    *,
    status: Optional[str] = None,
    name_contains: Optional[str] = None,
    code_contains: Optional[str] = None,
    delayed: Optional[bool] = None,
    min_progress: Optional[float] = None,
    max_progress: Optional[float] = None,
) -> QuerySet[Project]:
    """
    Selector profesional para dashboards Admin / Supervisor.
    """

    qs = Project.objects.all()

    if status:
        qs = qs.filter(status=status)

    if name_contains:
        qs = qs.filter(name__icontains=name_contains.strip())

    if code_contains:
        qs = qs.filter(code__icontains=code_contains.strip().upper())

    if delayed is not None:
        today = timezone.now().date()
        if delayed:
            qs = qs.filter(end_date_estimated__lt=today)
        else:
            qs = qs.filter(end_date_estimated__gte=today)

    if min_progress is not None:
        qs = qs.filter(progress__gte=min_progress)

    if max_progress is not None:
        qs = qs.filter(progress__lte=max_progress)

    return qs.order_by("-created_at")


# ============================================================
#   SELECTOR ESPECIAL PARA KPI / ALERTAS
# ============================================================


def get_projects_delayed() -> QuerySet[Project]:
    """
    Retorna todos los proyectos retrasados.
    """
    today = timezone.now().date()
    return Project.objects.filter(end_date_estimated__lt=today)
