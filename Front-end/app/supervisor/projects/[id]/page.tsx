"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { getProject, type Project } from "@/src/lib/api/projects";

import "@/styles/supervisor-project-detail.css";

export default function SupervisorProjectDetailPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = Number(params.id);

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadProject();
  }, [projectId]);

  async function loadProject() {
    try {
      setLoading(true);
      const data = await getProject(projectId);
      setProject(data);
    } catch (err: any) {
      setError(err.message || "Error al cargar proyecto");
    } finally {
      setLoading(false);
    }
  }

  if (loading)
    return (
      <div className="detail-container">
        <div className="detail-loading">Cargando proyecto...</div>
      </div>
    );

  if (error || !project)
    return (
      <div className="detail-container">
        <div className="detail-error">
          Error: {error || "Proyecto no encontrado"}
        </div>
      </div>
    );

  return (
    <div className="detail-container">
      {/* HEADER */}
      <div className="detail-header">
        <div>
          <h1 className="detail-title">{project.name}</h1>
          <p className="detail-subtitle">Código: {project.code}</p>
        </div>

        <div className="detail-actions">
          <button
            className="btn-secondary"
            onClick={() =>
              router.push(`/supervisor/projects/${project.id}/kpi`)
            }
          >
            Ver KPI
          </button>

          <button className="btn-secondary" onClick={() => router.back()}>
            Volver
          </button>
        </div>
      </div>

      {/* GENERAL INFORMATION */}
      <div className="detail-card">
        <h2 className="card-title">Información General</h2>

        <div className="info-grid">
          <div className="info-item">
            <span className="info-label">Código</span>
            <span className="info-value">{project.code}</span>
          </div>

          <div className="info-item">
            <span className="info-label">Estado</span>
            <span className={`status-badge ${project.status.toLowerCase()}`}>
              {project.status}
            </span>
          </div>

          <div className="info-item">
            <span className="info-label">Ubicación</span>
            <span className="info-value">{project.location}</span>
          </div>

          <div className="info-item">
            <span className="info-label">Fecha de Inicio</span>
            <span className="info-value">
              {new Date(project.start_date).toLocaleDateString("es-PE")}
            </span>
          </div>

          <div className="info-item">
            <span className="info-label">Fin Estimado</span>
            <span className="info-value">
              {new Date(project.end_date_estimated).toLocaleDateString("es-PE")}
            </span>
          </div>

          {/* PROGRESS */}
          <div className="info-item">
            <span className="info-label">Progreso</span>
            <div className="progress-block">
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${Number(project.progress) || 0}%` }}
                />
              </div>
              <span className="progress-text">
                {Number(project.progress).toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* SYSTEM INFO */}
      <div className="detail-card">
        <h2 className="card-title">Información del Sistema</h2>

        <div className="info-grid">
          <div className="info-item">
            <span className="info-label">ID</span>
            <span className="info-value">{project.id}</span>
          </div>

          <div className="info-item">
            <span className="info-label">Creado Por</span>
            <span className="info-value">{project.created_by}</span>
          </div>

          <div className="info-item">
            <span className="info-label">Actualizado Por</span>
            <span className="info-value">{project.updated_by}</span>
          </div>

          <div className="info-item">
            <span className="info-label">Fecha Creación</span>
            <span className="info-value">
              {new Date(project.created_at).toLocaleString("es-PE")}
            </span>
          </div>

          <div className="info-item">
            <span className="info-label">Última Actualización</span>
            <span className="info-value">
              {new Date(project.updated_at).toLocaleString("es-PE")}
            </span>
          </div>

          <div className="info-item">
            <span className="info-label">Content Hash</span>
            <span className="info-value hash-value">
              {project.content_hash}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
