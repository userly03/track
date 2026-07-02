"use client";

import { createContext, useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  login as apiLogin,
  googleLogin as apiGoogleLogin,
  register as apiRegister,
  logout as apiLogout,
  getCurrentUser,
} from "../api/auth";
import { getDefaultRouteForRole } from "./roles";
import { clearSession, SESSION_CLEARED_EVENT } from "./session";
import type { User, LoginCredentials, RegisterData } from "../api/auth";

export interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (
    credentials: LoginCredentials
  ) => Promise<{ ok: boolean; error?: string }>;
  googleLogin: (idToken: string) => Promise<{ ok: boolean; error?: string }>;
  register: (data: RegisterData) => Promise<{ ok: boolean; error?: string }>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(
  undefined
);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // ============================================
  // CARGAR USUARIO ACTUAL SI HAY TOKEN
  // ============================================
  useEffect(() => {
    loadUser();

    function handleSessionCleared() {
      setUser(null);
      setIsLoading(false);
    }

    window.addEventListener(SESSION_CLEARED_EVENT, handleSessionCleared);
    return () =>
      window.removeEventListener(SESSION_CLEARED_EVENT, handleSessionCleared);
  }, []);

  async function loadUser() {
    const token = localStorage.getItem("access_token");

    if (!token) {
      setIsLoading(false);
      return;
    }

    const res = await getCurrentUser();

    if (res.ok) {
      setUser(res.data!);
    } else {
      clearSession();
    }

    setIsLoading(false);
  }

  // ============================================
  // LOGIN (CORREGIDO)
  // ============================================
  async function login(credentials: LoginCredentials) {
    const res = await apiLogin(credentials);

    if (!res.ok) {
      return {
        ok: false,
        error:
          res.error ||
          (res as any).detail || // <── lee errores del backend sin romper TS
          "Error desconocido",
      };
    }

    const data = res.data!;

    localStorage.setItem("access_token", data.access);
    localStorage.setItem("refresh_token", data.refresh);

    setUser(data.user);

    const route = getDefaultRouteForRole(data.user.role);
    router.push(route);

    return { ok: true };
  }

  // ============================================
  // GOOGLE LOGIN
  // ============================================
  async function googleLogin(idToken: string) {
    const res = await apiGoogleLogin(idToken);

    if (!res.ok) {
      return {
        ok: false,
        error: res.error || "No se pudo iniciar sesion con Google",
      };
    }

    const data = res.data!;

    localStorage.setItem("access_token", data.access);
    localStorage.setItem("refresh_token", data.refresh);

    setUser(data.user);

    const route = getDefaultRouteForRole(data.user.role);
    router.push(route);

    return { ok: true };
  }

  // ============================================
  // REGISTER
  // ============================================
  async function register(data: RegisterData) {
    const res = await apiRegister(data);

    if (!res.ok) {
      return {
        ok: false,
        error: res.error || (res as any).detail || "Error desconocido",
      };
    }

    const val = res.data!;

    localStorage.setItem("access_token", val.access);
    localStorage.setItem("refresh_token", val.refresh);

    setUser(val.user);

    const route = getDefaultRouteForRole(val.user.role);
    router.push(route);

    return { ok: true };
  }

  // ============================================
  // LOGOUT
  // ============================================
  async function logout() {
    const refreshToken = localStorage.getItem("refresh_token");

    try {
      if (refreshToken) {
        await apiLogout(refreshToken);
      }
    } finally {
      clearSession();
    }
  }

  return (
    <AuthContext.Provider
      value={{ user, isLoading, login, googleLogin, register, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}
