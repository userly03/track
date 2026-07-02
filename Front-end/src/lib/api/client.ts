// src/lib/api/client.ts

import { clearSession } from "../auth/session";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8081";

interface RequestOptions extends RequestInit {
  requiresAuth?: boolean;
}

let isRefreshing = false;
let refreshPromise: Promise<string | null> | null = null;

/* ====================================================
   REFRESH ACCESS TOKEN — FIXED WITH /api/auth/refresh/
==================================================== */

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = localStorage.getItem("refresh_token");
  if (!refreshToken) {
    clearSession();
    return null;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/refresh/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh: refreshToken }),
    });

    if (!response.ok) {
      clearSession();
      return null;
    }

    const data = await response.json();

    localStorage.setItem("access_token", data.access);
    if (data.refresh) localStorage.setItem("refresh_token", data.refresh);

    return data.access;
  } catch {
    clearSession();
    return null;
  }
}

/* ====================================================
   API FETCH GENERAL — WITH MULTIPART FIX
==================================================== */

export async function apiFetch<T = any>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<{ ok: boolean; data?: T; error?: string }> {
  const { requiresAuth = true, headers = {}, ...restOptions } = options;

  const requestHeaders: Record<string, string> = {};

  // ❗ IMPORTANT: Solo ponemos Content-Type si NO es FormData
  const isFormData = restOptions.body instanceof FormData;

  if (!isFormData) {
    requestHeaders["Content-Type"] = "application/json";
  }

  // Copiamos headers personalizados
  if (headers instanceof Headers) {
    headers.forEach((v, k) => (requestHeaders[k] = v));
  } else if (typeof headers === "object") {
    Object.entries(headers).forEach(([k, v]) => {
      if (typeof v === "string") requestHeaders[k] = v;
    });
  }

  // Agregamos Authorization
  const accessToken = localStorage.getItem("access_token");
  if (requiresAuth && accessToken) {
    requestHeaders["Authorization"] = `Bearer ${accessToken}`;
  }

  const url = endpoint.startsWith("http")
    ? endpoint
    : `${API_BASE_URL}${endpoint}`;

  try {
    let response = await fetch(url, {
      ...restOptions,
      headers: requestHeaders,
    });

    /* ===========================
       HANDLE 401 → REFRESH TOKEN
    ========================== */
    if (response.status === 401 && requiresAuth) {
      if (!isRefreshing) {
        isRefreshing = true;
        refreshPromise = refreshAccessToken();
      }

      const newToken = await refreshPromise;
      isRefreshing = false;
      refreshPromise = null;

      if (!newToken) {
        return { ok: false, error: "Sesión expirada" };
      }

      requestHeaders["Authorization"] = `Bearer ${newToken}`;
      response = await fetch(url, {
        ...restOptions,
        headers: requestHeaders,
      });
    }

    /* ===========================
        MANEJO GENERAL DE ERRORES
    ========================== */

    if (!response.ok) {
      let errorMessage = "Ocurrió un error inesperado.";
      try {
        const errorJson = await response.json();
        errorMessage =
          errorJson?.detail ||
          errorJson?.error ||
          errorJson?.message ||
          errorMessage;
      } catch {}

      return { ok: false, error: errorMessage };
    }

    if (response.status === 204) {
      return { ok: true };
    }

    // Si es blob (descargas), no intentamos json
    const contentType = response.headers.get("Content-Type");
    if (contentType && contentType.includes("application/pdf")) {
      const blob = await response.blob();
      return { ok: true, data: blob as any };
    }

    const data = await response.json();
    return { ok: true, data };
  } catch (e) {
    return { ok: false, error: "No se pudo conectar con el servidor." };
  }
}
