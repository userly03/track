export type UserRole = "admin" | "supervisor"

export const ROLE_ROUTES: Record<UserRole, string> = {
  admin: "/admin",
  supervisor: "/supervisor",
}

export function getDefaultRouteForRole(role: UserRole): string {
  return ROLE_ROUTES[role] || "/login"
}

export function canAccessRoute(userRole: UserRole, pathname: string): boolean {
  // Public routes
  if (pathname === "/login" || pathname === "/register") {
    return true
  }

  // Admin can access /admin
  if (pathname.startsWith("/admin")) {
    return userRole === "admin"
  }

  // Supervisor can access /supervisor
  if (pathname.startsWith("/supervisor")) {
    return userRole === "supervisor"
  }

  return false
}
