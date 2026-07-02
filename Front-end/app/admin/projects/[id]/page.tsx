"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";

import {
  getProject,
  updateProject,
  type Project,
} from "@/src/lib/api/projects";

import "@/styles/form-admin.css";
import "@/styles/project-detail.css";

export default function ProjectDetailPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = Number(params?.id || 0);

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    code: "",
    name: "",
    location: "",
    start_date: "",
    end_date_estimated: "",
    progress: "0",
    status: "active",
  });

  const safeDate = (str: string) => {
    const d = new Date(str);
    return isNaN(d.getTime()) ? "—" : d.toLocaleDateString();
  };

  useEffect(() => {
    loadProject();
  }, [projectId]);

  async function loadProject() {
    try {
      setLoading(true);
      const data = await getProject(projectId);
      setProject(data);

      setFormData({
        code: data.code,
        name: data.name,
        location: data.location,
        start_date: data.start_date.split("T")[0],
        end_date_estimated: data.end_date_estimated.split("T")[0],
        progress: String(data.progress),
        status: data.status,
      });
    } catch (err: any) {
      setError(err.message || "Error al cargar proyecto");
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      await updateProject(projectId, {
        code: formData.code.trim(),
        name: formData.name.trim(),
        location: formData.location.trim(),
        start_date: formData.start_date,
        end_date_estimated: formData.end_date_estimated,
        progress: Number(formData.progress),
        status: formData.status,
        metadata: {},
      });

      await loadProject();
      setEditing(false);
    } catch (err: any) {
      setError(err.message || "Error al actualizar");
    } finally {
      setSaving(false);
    }
  }

  if (loading)
    return (
      <div className="details-loading">
        <div className="loading-text">Cargando proyecto…</div>
      </div>
    );

  if (!project)
    return (
      <div className="details-loading">
        <div className="error-text">Proyecto no encontrado</div>
      </div>
    );

  /* ============================================================
     MODO EDICIÓN
  ============================================================ */
  if (editing) {
    return (
      <div className="admin-form-container">
        <div className="admin-form-card">
          <h1 className="admin-form-title">Editar Proyecto</h1>

          {error && <div className="admin-form-error">{error}</div>}

          <form onSubmit={handleUpdate} className="admin-form">
            <div className="form-row">
              <div className="form-group">
                <label className="form-label required">Código</label>
                <input
                  className="form-input"
                  value={formData.code}
                  onChange={(e) =>
                    setFormData({ ...formData, code: e.target.value })
                  }
                />
              </div>

              <div className="form-group">
                <label className="form-label required">Estado</label>
                <select
                  className="form-select"
                  value={formData.status}
                  onChange={(e) =>
                    setFormData({ ...formData, status: e.target.value })
                  }
                >
                  <option value="active">Activo</option>
                  <option value="paused">Pausado</option>
                  <option value="completed">Completado</option>
                  <option value="cancelled">Cancelado</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label required">Nombre del Proyecto</label>
              <input
                className="form-input"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />
            </div>

            <div className="form-group">
              <label className="form-label required">Ubicación</label>
              <input
                className="form-input"
                value={formData.location}
                onChange={(e) =>
                  setFormData({ ...formData, location: e.target.value })
                }
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label required">Fecha Inicio</label>
                <input
                  type="date"
                  className="form-input"
                  value={formData.start_date}
                  onChange={(e) =>
                    setFormData({ ...formData, start_date: e.target.value })
                  }
                />
              </div>

              <div className="form-group">
                <label className="form-label required">
                  Fecha Fin Estimada
                </label>
                <input
                  type="date"
                  className="form-input"
                  value={formData.end_date_estimated}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      end_date_estimated: e.target.value,
                    })
                  }
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Progreso (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                className="form-input"
                value={formData.progress}
                onChange={(e) =>
                  setFormData({ ...formData, progress: e.target.value })
                }
              />
            </div>

            <div className="form-actions">
              <button className="btn-primary" disabled={saving}>
                {saving ? "Guardando…" : "Guardar Cambios"}
              </button>

              <button
                type="button"
                className="btn-secondary"
                onClick={() => setEditing(false)}
                disabled={saving}
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  /* ============================================================
     VISTA DETALLE
  ============================================================ */
  return (
    <div className="project-detail-wrapper">
      <div className="project-detail-header">
        <div className="left-actions">
          <button className="btn-link" onClick={() => router.back()}>
            ← Volver
          </button>
          <h1 className="project-title">{project.name}</h1>
        </div>

        <div className="project-actions">
          <button className="btn-primary" onClick={() => setEditing(true)}>
            Editar
          </button>

          <button
            className="btn-secondary"
            onClick={() => router.push(`/admin/projects/${project.id}/kpi`)}
          >
            Ver KPI
          </button>
        </div>
      </div>

      {/* Card 1 */}
      <div className="info-card">
        <div className="info-grid">
          <div className="info-item">
            <span className="info-label">Código</span>
            <span className="info-value">{project.code}</span>
          </div>

          <div className="info-item">
            <span className="info-label">Estado</span>
            <span className="info-value">{project.status}</span>
          </div>

          <div className="info-item">
            <span className="info-label">Ubicación</span>
            <span className="info-value">{project.location}</span>
          </div>

          <div className="info-item">
            <span className="info-label">Inicio</span>
            <span className="info-value">{safeDate(project.start_date)}</span>
          </div>

          <div className="info-item">
            <span className="info-label">Fin estimado</span>
            <span className="info-value">
              {safeDate(project.end_date_estimated)}
            </span>
          </div>

          <div className="info-item">
            <span className="info-label">Progreso</span>
            <div className="progress-block">
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${project.progress}%` }}
                ></div>
              </div>
              <span className="info-value">{project.progress}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Card 2 - Sistema */}
      <div className="info-card">
        <h3 className="info-title">Información del Sistema</h3>

        <div className="info-grid">
          <div className="info-item">
            <span className="info-label">ID</span>
            <span className="info-value">{project.id}</span>
          </div>

          <div className="info-item">
            <span className="info-label">Creado por</span>
            <span className="info-value">{project.created_by || "—"}</span>
          </div>

          <div className="info-item">
            <span className="info-label">Actualizado por</span>
            <span className="info-value">{project.updated_by || "—"}</span>
          </div>

          <div className="info-item">
            <span className="info-label">Fecha Creación</span>
            <span className="info-value">
              {new Date(project.created_at).toLocaleString()}
            </span>
          </div>

          <div className="info-item">
            <span className="info-label">Última actualización</span>
            <span className="info-value">
              {new Date(project.updated_at).toLocaleString()}
            </span>
          </div>

          <div className="info-item">
            <span className="info-label">Content Hash</span>
            <span className="info-value hash">{project.content_hash}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
