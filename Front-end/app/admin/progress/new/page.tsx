"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

import { createProgress } from "@/src/lib/api/progress";
import { getProjects, type Project } from "@/src/lib/api/projects";

import "@/styles/forms.css";
import "@/styles/progress-admin.css";

export default function NewProgressPage() {
  const router = useRouter();

  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    project: "",
    description: "",
    percentage: "",
    date: "",
    status: "pending" as "pending" | "approved" | "observed",
    metadata: "{}",
  });

  const [validationErrors, setValidationErrors] = useState({
    project: "",
    description: "",
    percentage: "",
    date: "",
    metadata: "",
  });

  /* ==========================================================
        CARGAR PROYECTOS
  ========================================================== */
  useEffect(() => {
    loadProjects();
  }, []);

  async function loadProjects() {
    try {
      const res = await getProjects();
      setProjects(Array.isArray(res) ? res : []); // ← PARCHE CRÍTICO
    } catch (err: any) {
      setError(err.message || "Error al cargar proyectos");
      setProjects([]); // ← evitar crash
    } finally {
      setLoading(false);
    }
  }

  /* ==========================================================
        VALIDACIÓN
  ========================================================== */
  function validateForm(): boolean {
    const errors = {
      project: "",
      description: "",
      percentage: "",
      date: "",
      metadata: "",
    };

    if (!formData.project) errors.project = "Debe seleccionar un proyecto";

    if (!formData.description.trim())
      errors.description = "La descripción es obligatoria";

    const perc = Number(formData.percentage);
    if (!formData.percentage) {
      errors.percentage = "El porcentaje es obligatorio";
    } else if (isNaN(perc) || perc < 0 || perc > 100) {
      errors.percentage = "Debe estar entre 0 y 100";
    }

    if (!formData.date) {
      errors.date = "La fecha es obligatoria";
    } else {
      const sel = new Date(formData.date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (sel > today) errors.date = "La fecha no puede ser futura";
    }

    try {
      JSON.parse(formData.metadata);
    } catch {
      errors.metadata = "Metadata debe ser JSON válido";
    }

    setValidationErrors(errors);
    return !Object.values(errors).some((e) => e !== "");
  }

  /* ==========================================================
        SUBMIT
  ========================================================== */
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      setSubmitting(true);
      setError("");

      await createProgress({
        project: Number(formData.project),
        description: formData.description,
        percentage: Number(formData.percentage),
        date: formData.date,
        status: formData.status,
        metadata: JSON.parse(formData.metadata),
      });

      router.push("/admin/progress");
    } catch (err: any) {
      setError(err.message || "Error al crear reporte");
    } finally {
      setSubmitting(false);
    }
  }

  /* ==========================================================
        UI LOAD
  ========================================================== */
  if (loading) {
    return (
      <div className="form-container">
        <div className="form-card">Cargando proyectos...</div>
      </div>
    );
  }

  /* ==========================================================
        UI
  ========================================================== */
  return (
    <div className="form-container">
      <div className="form-card">
        <h1 className="form-title">Nuevo Reporte de Progreso</h1>

        {error && <div className="form-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          {/* PROYECTO */}
          <div className="form-group">
            <label className="form-label required">Proyecto</label>

            <select
              className="form-select"
              value={formData.project}
              onChange={(e) =>
                setFormData({ ...formData, project: e.target.value })
              }
            >
              <option value="">Seleccionar proyecto...</option>

              {/* PROTECCIÓN: NUNCA CRASHEA */}
              {Array.isArray(projects) &&
                projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.code ? `${p.code} — ${p.name}` : p.name}
                  </option>
                ))}
            </select>

            {validationErrors.project && (
              <span className="form-error">{validationErrors.project}</span>
            )}
          </div>

          {/* DESCRIPCIÓN */}
          <div className="form-group">
            <label className="form-label required">Descripción</label>
            <textarea
              className="form-textarea"
              rows={4}
              placeholder="Descripción del avance..."
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
            />
            {validationErrors.description && (
              <span className="form-error">{validationErrors.description}</span>
            )}
          </div>

          {/* PORCENTAJE Y FECHA */}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label required">Porcentaje (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.01"
                className="form-input"
                placeholder="0 - 100"
                value={formData.percentage}
                onChange={(e) =>
                  setFormData({ ...formData, percentage: e.target.value })
                }
              />
              {validationErrors.percentage && (
                <span className="form-error">
                  {validationErrors.percentage}
                </span>
              )}
            </div>

            <div className="form-group">
              <label className="form-label required">Fecha</label>
              <input
                type="date"
                className="form-input"
                max={new Date().toISOString().split("T")[0]}
                value={formData.date}
                onChange={(e) =>
                  setFormData({ ...formData, date: e.target.value })
                }
              />
              {validationErrors.date && (
                <span className="form-error">{validationErrors.date}</span>
              )}
            </div>
          </div>

          {/* BOTONES */}
          <div className="form-actions">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => router.back()}
              disabled={submitting}
            >
              Volver
            </button>

            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? "Creando..." : "Crear Reporte"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
