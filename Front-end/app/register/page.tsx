"use client";

import { useState, type FormEvent } from "react";
import { useAuth } from "@/src/lib/auth/use-auth";
import Link from "next/link";
import "@/styles/auth.css";

export default function RegisterPage() {
  const { register, isLoading } = useAuth();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // -------------------------------------------
  // VALIDACIONES LOCALES ANTES DE ENVIAR
  // -------------------------------------------
  function validateForm() {
    if (username.trim().length < 3) {
      return "El usuario debe tener al menos 3 caracteres";
    }

    if (!email.includes("@") || !email.includes(".")) {
      return "Ingrese un correo válido";
    }

    if (password.length < 8) {
      return "La contraseña debe tener al menos 8 caracteres";
    }

    return null;
  }

  // -------------------------------------------
  // SUBMIT
  // -------------------------------------------
  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSubmitting(true);

    const result = await register({ username, email, password });

    if (!result.ok) {
      setError(result.error || "No se pudo registrar el usuario");
      setIsSubmitting(false);
      return;
    }

    setIsSubmitting(false);
  }

  if (isLoading) {
    return <div className="auth-loading">Cargando...</div>;
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1 className="auth-title">Registro</h1>
        <p className="auth-subtitle">TrackBuild - Sistema de Gestión</p>

        <form onSubmit={handleSubmit} className="auth-form">
          {/* Username */}
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
                setError("");
              }}
              required
              disabled={isSubmitting}
              placeholder="Ingrese un nombre de usuario"
            />
          </div>

          {/* Email */}
          <div className="auth-field">
            <label htmlFor="email" className="auth-label">
              Email
            </label>
            <input
              id="email"
              type="email"
              className="auth-input"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError("");
              }}
              required
              disabled={isSubmitting}
              placeholder="correo@ejemplo.com"
            />
          </div>

          {/* Password */}
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
                setError("");
              }}
              required
              disabled={isSubmitting}
              placeholder="Mínimo 8 caracteres"
            />
          </div>

          {/* Error */}
          {error && <div className="auth-error">{error}</div>}

          {/* Submit */}
          <button type="submit" disabled={isSubmitting} className="auth-button">
            {isSubmitting ? "Registrando..." : "Registrarse"}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            ¿Ya tienes cuenta? <Link href="/login">Iniciar sesión</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
