from rest_framework.permissions import BasePermission, SAFE_METHODS


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


class IsAdminOrReadOnly(BasePermission):
    """
    Permite lectura a los roles autenticados y reserva mutaciones al admin.
    """

    def has_permission(self, request, view):
        user = request.user

        if not user or not user.is_authenticated:
            return False

        if request.method in SAFE_METHODS:
            return user.role in ["admin", "supervisor"]

        return user.role == "admin"
