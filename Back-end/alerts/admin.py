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
    Obtiene alertas según los proyectos asignados al supervisor.
    Suponemos:
    - user.supervisor_projects es la relación que indica los proyectos del supervisor.
    """

    # Si es admin → ve todo
    if user.role == "admin":
        return Alert.objects.all().select_related("project")

    # Supervisor técnico → solo sus proyectos
    assigned_projects = Project.objects.filter(supervisor=user)

    return (
        Alert.objects.select_related("project")
        .filter(project__in=assigned_projects)
        .order_by("-created_at")
    )
