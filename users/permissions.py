from rest_framework.permissions import BasePermission


class IsAdminRole(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == "admin"


class IsSupervisorRole(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == "supervisor"


class IsAdminOrSupervisor(BasePermission):
    """
    Permiso genérico para cualquier usuario autenticado con rol válido.
    Útil para la mayoría de endpoints internos de TrackBuild.
    """

    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in [
            "admin",
            "supervisor",
        ]
