"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createProject } from "@/src/lib/api/projects";
import "@/styles/form-admin.css";

export default function NewProjectPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    code: "",
    name: "",
    location: "",
    start_date: "",
    end_date_estimated: "",
    progress: "",
    status: "active",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await createProject({
        code: formData.code,
        name: formData.name,
        location: formData.location,
        start_date: formData.start_date,
        end_date_estimated: formData.end_date_estimated,
        progress: formData.progress ? Number(formData.progress) : 0,
        status: formData.status,
      });

      router.push("/admin/projects");
    } catch (err: any) {
      setError(err.message || "Error al crear proyecto");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="admin-form-container">
      <div className="admin-form-card">
        <h1 className="admin-form-title">Nuevo Proyecto</h1>

        {error && <div className="admin-form-error">{error}</div>}

        <form onSubmit={handleSubmit} className="admin-form">
          {/* FILA 1 */}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label required">Código</label>
              <input
                type="text"
                className="form-input"
                placeholder="EJ: PRJ-001-AQP"
                value={formData.code}
                onChange={(e) =>
                  setFormData({ ...formData, code: e.target.value })
                }
                required
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
                required
              >
                <option value="active">Activo</option>
                <option value="paused">Pausado</option>
                <option value="completed">Completado</option>
                <option value="cancelled">Cancelado</option>
              </select>
            </div>
          </div>

          {/* Nombre */}
          <div className="form-group">
            <label className="form-label required">Nombre del Proyecto</label>
            <input
              type="text"
              className="form-input"
              placeholder="EJ: Construcción de Centro Logístico"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              required
            />
          </div>

          {/* Ubicación */}
          <div className="form-group">
            <label className="form-label required">Ubicación</label>
            <input
              type="text"
              className="form-input"
              placeholder="EJ: Arequipa, Cerro Colorado"
              value={formData.location}
              onChange={(e) =>
                setFormData({ ...formData, location: e.target.value })
              }
              required
            />
          </div>

          {/* FECHAS */}
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
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label required">Fecha Fin Estimada</label>
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
                required
              />
            </div>
          </div>

          {/* PROGRESO */}
          <div className="form-group">
            <label className="form-label">Progreso (%)</label>
            <input
              type="number"
              className="form-input"
              placeholder="0 a 100"
              min="0"
              max="100"
              step="0.1"
              value={formData.progress}
              onChange={(e) =>
                setFormData({ ...formData, progress: e.target.value })
              }
            />
          </div>

          {/* ACCIONES */}
          <div className="form-actions">
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? "Creando..." : "Crear Proyecto"}
            </button>

            <button
              type="button"
              className="btn-secondary"
              onClick={() => router.back()}
              disabled={loading}
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
