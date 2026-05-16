from django.db.models import Q
from .models import Alert
from projects.models import Project


# ================================================
# OBTENER ALERTAS POR PROYECTO
# ================================================
def get_alerts_by_project(project_id):
    """
    Devuelve todas las alertas asociadas a un proyecto.
    """
    return (
        Alert.objects.select_related("project")
        .filter(project_id=project_id)
        .order_by("-created_at")
    )


# ================================================
# OBTENER SOLO ALERTAS ACTIVAS
# ================================================
def get_active_alerts():
    """
    Devuelve todas las alertas activas del sistema.
    """
    return (
        Alert.objects.select_related("project")
        .filter(status="active")
        .order_by("-created_at")
    )


# ================================================
# ALERTAS RELEVANTES PARA UN SUPERVISOR
# ================================================
def get_alerts_for_supervisor(user):
    """
    Regla PRO:
    - Admin → ve todas las alertas
    - Supervisor → solo ve alertas de sus proyectos asignados
    """

    if user.role == "admin":
        return Alert.objects.select_related("project").all().order_by("-created_at")

    # Supervisor → solo alertas de proyectos donde user es supervisor
    assigned_projects = Project.objects.filter(supervisor=user)

    return (
        Alert.objects.select_related("project")
        .filter(project__in=assigned_projects)
        .order_by("-created_at")
    )
