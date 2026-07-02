"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { getAlert, type Alert } from "@/src/lib/api/alerts";
import { getProjects, type Project } from "@/src/lib/api/projects";

import "@/styles/supervisor-alert-detail.css";

export default function AlertDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolved = use(params); // ← NECESARIO EN CLIENT COMPONENT
  const alertId = Number(resolved.id);

  const router = useRouter();
  const [alert, setAlert] = useState<Alert | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadData();
  }, [alertId]);

  async function loadData() {
    try {
      setLoading(true);
      const [alertData, projectsData] = await Promise.all([
        getAlert(alertId),
        getProjects(),
      ]);
      setAlert(alertData);
      setProjects(projectsData);
    } catch (err: any) {
      setError(err.message || "Error al cargar alerta");
    } finally {
      setLoading(false);
    }
  }

  function getProjectName(projectId: number) {
    return (
      projects.find((p) => p.id === projectId)?.name || `Proyecto #${projectId}`
    );
  }

  function getRelatedEntityLink() {
    if (!alert) return null;

    const base: Record<string, string> = {
      purchase: "/supervisor/purchases",
      delivery: "/supervisor/deliveries",
      progress: "/supervisor/progress",
      document: "/supervisor/documents",
    };

    const path = base[alert.item_type];
    if (!path) return null;

    return `${path}/${alert.item_id}`;
  }

  if (loading) {
    return (
      <div className="alert-detail-container">
        <div className="loading-box">Cargando alerta...</div>
      </div>
    );
  }

  if (error || !alert) {
    return (
      <div className="alert-detail-container">
        <div className="error-box">
          Error: {error || "Alerta no encontrada"}
        </div>
      </div>
    );
  }

  const relatedLink = getRelatedEntityLink();

  return (
    <div className="alert-detail-container">
      <div className="detail-header">
        <h1 className="detail-title">Detalle de Alerta</h1>
        <button
          className="btn-back"
          onClick={() => router.push("/supervisor/alerts")}
        >
          ← Volver
        </button>
      </div>

      <div className="alert-card">
        <div className="badge-row">
          <span className={`badge severity ${alert.severity}`}>
            {alert.severity === "critical" && "Crítica"}
            {alert.severity === "warning" && "Advertencia"}
            {alert.severity === "info" && "Información"}
          </span>

          <span className={`badge status ${alert.status}`}>
            {alert.status === "active" ? "Activa" : "Resuelta"}
          </span>
        </div>

        <div className="info-grid">
          <div className="info-item">
            <label>Título</label>
            <p>{alert.title}</p>
          </div>

          <div className="info-item">
            <label>Proyecto</label>
            <p>{getProjectName(alert.projectId)}</p>
          </div>

          <div className="info-item">
            <label>Tipo</label>
            <p>
              <span className={`badge type ${alert.item_type}`}>
                {alert.item_type}
              </span>
            </p>
          </div>

          <div className="info-item">
            <label>ID Relacionado</label>
            <p>#{alert.item_id}</p>
          </div>

          <div className="info-item">
            <label>Creado</label>
            <p>
              {new Date(alert.created_at).toLocaleDateString()}{" "}
              {new Date(alert.created_at).toLocaleTimeString()}
            </p>
          </div>

          {alert.resolved_at && (
            <div className="info-item">
              <label>Resuelto</label>
              <p>
                {new Date(alert.resolved_at).toLocaleDateString()}{" "}
                {new Date(alert.resolved_at).toLocaleTimeString()}
              </p>
            </div>
          )}
        </div>

        <div className="section">
          <h2 className="section-title">Mensaje</h2>
          <div className="message-box">{alert.message}</div>
        </div>

        {relatedLink && (
          <div className="section actions-section">
            <h2 className="section-title">Acciones</h2>
            <button
              className="btn-related"
              onClick={() => router.push(relatedLink)}
            >
              Ver elemento relacionado
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
