"use client";

import { useState, type FormEvent } from "react";
import { GoogleLogin } from "@react-oauth/google";
import { useAuth } from "@/src/lib/auth/use-auth";
import Link from "next/link";
import "@/styles/auth.css";

export default function LoginPage() {
  const { login, googleLogin, isLoading } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    // Validación rápida frontend
    if (!username.trim() || !password.trim()) {
      setError("Debe ingresar usuario y contraseña.");
      return;
    }

    setIsSubmitting(true);

    const result = await login({ username, password });

    // Mostrar mensaje del backend (correcto)
    if (!result.ok) {
      setError(result.error || "Credenciales incorrectas");
      setIsSubmitting(false);
      return;
    }

    setIsSubmitting(false);
  }

  async function handleGoogleSuccess(credential?: string) {
    setError("");

    if (!credential) {
      setError("Google no devolvio una credencial valida.");
      return;
    }

    setIsGoogleSubmitting(true);

    const result = await googleLogin(credential);

    if (!result.ok) {
      setError(result.error || "No se pudo iniciar sesion con Google.");
      setIsGoogleSubmitting(false);
      return;
    }

    setIsGoogleSubmitting(false);
  }

  if (isLoading) {
    return <div className="auth-loading">Cargando...</div>;
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1 className="auth-title">Iniciar Sesión</h1>
        <p className="auth-subtitle">TrackBuild - Sistema de Gestión</p>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="auth-field">
            <label htmlFor="username" className="auth-label">
              Usuario
            </label>
            <input
              id="username"
              type="text"
              className="auth-input"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                setError(""); // limpia error al escribir
              }}
              required
              disabled={isSubmitting || isGoogleSubmitting}
              placeholder="Ingrese su usuario"
            />
          </div>

          <div className="auth-field">
            <label htmlFor="password" className="auth-label">
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              className="auth-input"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError(""); // limpia error al escribir
              }}
              required
              disabled={isSubmitting || isGoogleSubmitting}
              placeholder="Ingrese su contraseña"
            />
          </div>

          {/* ERROR MOSTRADO DEL BACKEND */}
          {error && <div className="auth-error">{error}</div>}

          <button
            type="submit"
            disabled={isSubmitting || isGoogleSubmitting}
            className="auth-button"
          >
            {isSubmitting ? "Iniciando sesión..." : "Entrar"}
          </button>
        </form>

        <div className="auth-divider">
          <span>o</span>
        </div>

        <div
          className={`auth-google ${
            isSubmitting || isGoogleSubmitting ? "is-disabled" : ""
          }`}
          aria-busy={isGoogleSubmitting}
        >
          <GoogleLogin
            onSuccess={(response) =>
              void handleGoogleSuccess(response.credential)
            }
            onError={() =>
              setError("No se pudo completar el acceso con Google.")
            }
            text="continue_with"
            shape="rectangular"
            size="large"
          />
          {isGoogleSubmitting && (
            <p className="auth-google-status">Validando con Google...</p>
          )}
        </div>

        <div className="auth-footer">
          <p>
            ¿No tienes cuenta? <Link href="/register">Registrarse</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
