import { apiFetch } from "./client"

export interface User {
  id: number
  username: string
  email: string
  role: "admin" | "supervisor"
  digital_signature?: string
}

export interface AuthResponse {
  user: User
  access: string
  refresh: string
}

export interface LoginCredentials {
  username: string
  password: string
}

export interface RegisterData {
  username: string
  email: string
  password: string
}

/* ===============================
   LOGIN
================================= */
export async function login(credentials: LoginCredentials) {
  const response = await apiFetch<AuthResponse>("/api/auth/login/", {
    method: "POST",
    requiresAuth: false,
    body: JSON.stringify(credentials),
  })

  if (!response.ok) return { ok: false, error: response.error }
  return { ok: true, data: response.data }
}

/* ===============================
   GOOGLE LOGIN
================================= */
export async function googleLogin(idToken: string) {
  const response = await apiFetch<AuthResponse>("/api/auth/google/", {
    method: "POST",
    requiresAuth: false,
    body: JSON.stringify({ id_token: idToken }),
  })

  if (!response.ok) return { ok: false, error: response.error }
  return { ok: true, data: response.data }
}

/* ===============================
   REGISTER
================================= */
export async function register(data: RegisterData) {
  const response = await apiFetch<AuthResponse>("/api/auth/register/", {
    method: "POST",
    requiresAuth: false,
    body: JSON.stringify(data),
  })

  if (!response.ok) return { ok: false, error: response.error }
  return { ok: true, data: response.data }
}

/* ===============================
   CURRENT USER
================================= */
export async function getCurrentUser() {
  const response = await apiFetch<User>("/api/auth/me/", {
    method: "GET",
    requiresAuth: true,
  })

  if (!response.ok) return { ok: false, error: response.error }
  return { ok: true, data: response.data }
}

/* ===============================
   REFRESH TOKEN
================================= */
export async function refreshToken(refreshToken: string) {
  const response = await apiFetch<{ access: string; refresh?: string }>(
    "/api/auth/refresh/",
    {
      method: "POST",
      requiresAuth: false,
      body: JSON.stringify({ refresh: refreshToken }),
    }
  )

  if (!response.ok) return { ok: false, error: response.error }
  return { ok: true, data: response.data }
}

/* ===============================
   LOGOUT
================================= */
export async function logout(refreshToken: string) {
  const response = await apiFetch("/api/auth/logout/", {
    method: "POST",
    requiresAuth: false,
    body: JSON.stringify({ refresh: refreshToken }),
  })

  if (!response.ok) return { ok: false, error: response.error }
  return { ok: true }
}
