import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const PUBLIC_ROUTES = ["/login", "/register"]
const PROTECTED_ROUTES = {
  "/admin": "admin",
  "/supervisor": "supervisor",
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow public routes
  if (PUBLIC_ROUTES.includes(pathname)) {
    return NextResponse.next()
  }

  // Check if user has tokens in cookies (we'll use headers to pass this info)
  // Note: Since we're using localStorage, we need to handle this on the client
  // This middleware will redirect based on route patterns

  // Check for protected routes
  for (const [route, requiredRole] of Object.entries(PROTECTED_ROUTES)) {
    if (pathname.startsWith(route)) {
      // The actual role validation happens on the client side with the AuthProvider
      // This middleware just ensures structure
      return NextResponse.next()
    }
  }

  // Default: allow navigation
  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|icon.*\\.png|apple-icon\\.png).*)"],
}
