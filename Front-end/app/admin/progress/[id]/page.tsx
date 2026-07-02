"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";

import {
  getProgressReport,
  updateProgress,
  type ProgressReport,
} from "@/src/lib/api/progress";

import { getProjects, type Project } from "@/src/lib/api/projects";

import "@/styles/forms.css";
import "@/styles/progress-admin.css";

export default function EditProgressPage() {
  const router = useRouter();
  const params = useParams();
  const id = Number(params.id);

  const [report, setReport] = useState<ProgressReport | null>(null);
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

  useEffect(() => {
    loadData();
  }, [id]);

  async function loadData() {
    try {
      setLoading(true);

      const [reportData, projectsData] = await Promise.all([
        getProgressReport(id),
        getProjects(),
      ]);

      setReport(reportData);
      setProjects(Array.isArray(projectsData) ? projectsData : []);

      setFormData({
        project: reportData.project?.toString() ?? "",
        description: reportData.description ?? "",
        percentage: reportData.percentage?.toString() ?? "",
        date: reportData.date ?? "",
        status: reportData.status ?? "pending",
        metadata: JSON.stringify(reportData.metadata ?? {}, null, 2),
      });
    } catch (err: any) {
      setError(err.message || "Error al cargar reporte");
    } finally {
      setLoading(false);
    }
  }

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

    const percentage = Number(formData.percentage);
    if (!formData.percentage) {
      errors.percentage = "El porcentaje es obligatorio";
    } else if (isNaN(percentage) || percentage < 0 || percentage > 100) {
      errors.percentage = "Debe estar entre 0 y 100";
    }

    if (!formData.date) {
      errors.date = "La fecha es obligatoria";
    } else {
      const selectedDate = new Date(formData.date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (selectedDate > today) {
        errors.date = "La fecha no puede ser futura";
      }
    }

    try {
      JSON.parse(formData.metadata);
    } catch {
      errors.metadata = "Metadata debe ser JSON válido";
    }

    setValidationErrors(errors);
    return !Object.values(errors).some((e) => e !== "");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      setSubmitting(true);
      setError("");

      const data = {
        project: Number(formData.project),
        description: formData.description,
        percentage: Number(formData.percentage),
        date: formData.date,
        status: formData.status,
        metadata: JSON.parse(formData.metadata),
      };

      await updateProgress(id, data);
      router.push("/admin/progress");
    } catch (err: any) {
      setError(err.message || "Error al actualizar reporte");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="form-container">
        <div className="form-card">Cargando reporte...</div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="form-container">
        <div className="form-card">Reporte no encontrado</div>
      </div>
    );
  }

  return (
    <div className="form-container">
      <div className="form-card">
        <h1 className="form-title">Editar Reporte de Progreso</h1>

        {/* HASHES */}
        <div className="progress-hashes">
          <div className="hash-item">
            <span className="hash-label">Content Hash</span>
            <span className="hash-value">{report.content_hash}</span>
          </div>

          <div className="hash-item">
            <span className="hash-label">Previous Hash</span>
            <span className="hash-value">{report.previous_hash}</span>
          </div>
        </div>

        {error && <div className="form-error">{error}</div>}

        {/* FORM */}
        <form onSubmit={handleSubmit}>
          {/* Proyecto */}
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

          {/* Descripción */}
          <div className="form-group">
            <label className="form-label required">Descripción</label>
            <textarea
              className="form-textarea"
              rows={4}
              value={formData.description}
              placeholder="Describe el avance..."
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
            />
            {validationErrors.description && (
              <span className="form-error">{validationErrors.description}</span>
            )}
          </div>

          {/* Porcentaje y Fecha */}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label required">Porcentaje</label>
              <input
                type="number"
                className="form-input"
                min="0"
                max="100"
                step="0.01"
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

          {/* Botones */}
          <div className="form-actions">
            <button
              type="button"
              className="btn-secondary"
              disabled={submitting}
              onClick={() => router.back()}
            >
              Volver
            </button>

            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? "Guardando..." : "Guardar Cambios"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
