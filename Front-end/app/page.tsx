"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/src/lib/auth/use-auth"
import { getDefaultRouteForRole } from "@/src/lib/auth/roles"

export default function HomePage() {
  const { user, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading) {
      if (user) {
        const defaultRoute = getDefaultRouteForRole(user.role)
        router.push(defaultRoute)
      } else {
        router.push("/login")
      }
    }
  }, [user, isLoading, router])

  return <div>Redirigiendo...</div>
}
