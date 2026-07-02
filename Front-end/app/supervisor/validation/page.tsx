"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import {
  getValidationItems,
  type ValidationItem,
} from "@/src/lib/api/validation";
import { getProjects, type Project } from "@/src/lib/api/projects";

import "@/styles/supervisor-validation.css";

export default function SupervisorValidationInboxPage() {
  const router = useRouter();

  const [items, setItems] = useState<ValidationItem[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // filters
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterProject, setFilterProject] = useState("all");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);

      const [itemsData, projectsData] = await Promise.all([
        getValidationItems(),
        getProjects(),
      ]);

      setItems(itemsData);
      setProjects(projectsData);
    } catch (err: any) {
      setError(err.message || "Error al cargar validaciones");
    } finally {
      setLoading(false);
    }
  }

  function getProjectName(id: number) {
    return projects.find((p) => p.id === id)?.name || `Proyecto #${id}`;
  }

  const filteredItems = items.filter((item) => {
    if (filterType !== "all" && item.type !== filterType) return false;
    if (filterStatus !== "all" && item.status !== filterStatus) return false;
    if (filterProject !== "all" && item.project_id.toString() !== filterProject)
      return false;

    return true;
  });

  if (loading) {
    return (
      <div className="validation-page">
        <div className="loading-box">Cargando validaciones...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="validation-page">
        <div className="error-box">Error: {error}</div>
      </div>
    );
  }
  function getRelatedLabel(item: ValidationItem): string {
    const labels: Record<string, string> = {
      purchase: "Compra",
      delivery: "Entrega",
      progress: "Avance",
      document: "Documento",
    };

    return `${labels[item.type] || "Elemento"} #${item.related_id}`;
  }

  return (
    <div className="validation-page">
      <div className="page-header">
        <h1 className="page-title">Bandeja de Validaciones</h1>
      </div>

      {/* FILTROS */}
      <div className="filters-card">
        <div className="filter-item">
          <label>Tipo</label>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
          >
            <option value="all">Todos</option>
            <option value="purchase">Compras</option>
            <option value="delivery">Entregas</option>
            <option value="progress">Avances</option>
            <option value="document">Documentos</option>
          </select>
        </div>

        <div className="filter-item">
          <label>Estado</label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="all">Todos</option>
            <option value="pending">Pendiente</option>
            <option value="under_review">En revisión</option>
            <option value="approved_partial">Aprob. parcial</option>
            <option value="approved">Aprobado</option>
            <option value="rejected">Rechazado</option>
            <option value="auto_closed">Auto cerrado</option>
          </select>
        </div>

        <div className="filter-item">
          <label>Proyecto</label>
          <select
            value={filterProject}
            onChange={(e) => setFilterProject(e.target.value)}
          >
            <option value="all">Todos</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id.toString()}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* GRID */}
      <div className="validation-grid">
        {filteredItems.length === 0 ? (
          <div className="empty-box">No hay validaciones</div>
        ) : (
          filteredItems.map((item) => (
            <div key={item.id} className="validation-card">
              <div className="card-header">
                <span className={`type-badge type-${item.type}`}>
                  {item.type}
                </span>

                <span className={`status-badge status-${item.status}`}>
                  {item.status.replace(/_/g, " ")}
                </span>
              </div>

              <div className="card-body">
                <div className="info-row">
                  <label>Proyecto:</label>
                  <span>{getProjectName(item.project_id)}</span>
                </div>

                <div className="info-row">
                  <label>Elemento en revisión:</label>
                  <span>{getRelatedLabel(item)}</span>
                </div>

                {/* PROGRESO */}
                <div className="progress-section">
                  <div className="progress-bar">
                    <div
                      className="progress-fill"
                      style={{
                        width: `${
                          (item.approvals_count / item.required_approvals) * 100
                        }%`,
                      }}
                    ></div>
                  </div>
                  <div className="progress-text">
                    {item.approvals_count} / {item.required_approvals}{" "}
                    aprobaciones
                  </div>

                  {item.rejections_count > 0 && (
                    <div className="rejection-warning">
                      ⚠ {item.rejections_count} rechazo(s)
                    </div>
                  )}
                </div>

                <div className="date-field">
                  {new Date(item.created_at).toLocaleDateString()} —{" "}
                  {new Date(item.created_at).toLocaleTimeString()}
                </div>
              </div>

              <div className="card-footer">
                <button
                  className="btn-review"
                  onClick={() =>
                    router.push(`/supervisor/validation/${item.id}`)
                  }
                >
                  Revisar
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
