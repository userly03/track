"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { getAlerts, type Alert, type AlertFilters } from "@/src/lib/api/alerts";
import { getProjects, type Project } from "@/src/lib/api/projects";

import "@/styles/supervisor-alerts.css";

export default function SupervisorAlertsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [filterSeverity, setFilterSeverity] = useState(
    searchParams.get("severity") || "all"
  );
  const [filterStatus, setFilterStatus] = useState(
    searchParams.get("status") || "all"
  );
  const [filterType, setFilterType] = useState(
    searchParams.get("item_type") || "all"
  );
  const [filterProject, setFilterProject] = useState(
    searchParams.get("project") || "all"
  );

  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    loadData();
  }, [filterSeverity, filterStatus, filterType, filterProject]);

  async function loadData() {
    try {
      setLoading(true);

      const filters: AlertFilters = {
        severity: filterSeverity,
        status: filterStatus,
        item_type: filterType,
        project: filterProject,
      };

      const [alertsData, projectsData] = await Promise.all([
        getAlerts(filters),
        getProjects(),
      ]);

      setAlerts(alertsData);
      setProjects(projectsData);
    } catch (err: any) {
      setError(err.message || "Error al cargar alertas");
    } finally {
      setLoading(false);
    }
  }

  function getProjectName(projectId: number): string {
    return (
      projects.find((p) => p.id === projectId)?.name || `Proyecto #${projectId}`
    );
  }

  const filteredAlerts = alerts.filter((a) => {
    if (
      searchQuery.trim() &&
      !a.title.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  if (loading) {
    return (
      <div className="alerts-container">
        <div className="loading-box">Cargando alertas...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alerts-container">
        <div className="error-box">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="alerts-container">
      <div className="alerts-header">
        <h1 className="alerts-title">Monitoreo de Alertas</h1>
      </div>

      {/* ------------------------------------------- */}
      {/* FILTROS */}
      {/* ------------------------------------------- */}
      <div className="alerts-filters">
        {/* SEVERIDAD */}
        <div className="filter-group">
          <label className="filter-label">Severidad</label>
          <select
            className="filter-select"
            value={filterSeverity}
            onChange={(e) => setFilterSeverity(e.target.value)}
          >
            <option value="all">Todas</option>
            <option value="critical">Crítica</option>
            <option value="warning">Advertencia</option>
            <option value="info">Información</option>
          </select>
        </div>

        {/* ESTADO */}
        <div className="filter-group">
          <label className="filter-label">Estado</label>
          <select
            className="filter-select"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="all">Todos</option>
            <option value="active">Activa</option>
            <option value="resolved">Resuelta</option>
          </select>
        </div>

        {/* TIPO */}
        <div className="filter-group">
          <label className="filter-label">Tipo</label>
          <select
            className="filter-select"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
          >
            <option value="all">Todos</option>
            <option value="purchase">Compras</option>
            <option value="delivery">Entregas</option>
            <option value="progress">Avances</option>
            <option value="document">Documentos</option>
            <option value="system">Sistema</option>
          </select>
        </div>

        {/* PROYECTO */}
        <div className="filter-group">
          <label className="filter-label">Proyecto</label>
          <select
            className="filter-select"
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

        {/* BUSCADOR */}
        <div className="filter-group">
          <label className="filter-label">Buscar</label>
          <input
            type="text"
            className="filter-input"
            placeholder="Buscar por título..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* ------------------------------------------- */}
      {/* TABLA */}
      {/* ------------------------------------------- */}
      <div className="alerts-table-wrapper">
        <table className="alerts-table">
          <thead>
            <tr>
              <th>Severidad</th>
              <th>Título</th>
              <th>Mensaje</th>
              <th>Proyecto</th>
              <th>Tipo</th>
              <th>Estado</th>
              <th>Fecha</th>
              <th>Acciones</th>
            </tr>
          </thead>

          <tbody>
            {filteredAlerts.length === 0 ? (
              <tr>
                <td colSpan={8} className="empty-row">
                  No hay alertas disponibles
                </td>
              </tr>
            ) : (
              filteredAlerts.map((alert) => (
                <tr key={alert.id}>
                  <td>
                    <span className={`severity-badge ${alert.severity}`}>
                      {alert.severity === "critical" && "Crítica"}
                      {alert.severity === "warning" && "Advertencia"}
                      {alert.severity === "info" && "Info"}
                    </span>
                  </td>

                  <td>
                    <strong>{alert.title}</strong>
                  </td>

                  <td>{alert.message.substring(0, 60)}…</td>

                  <td>{getProjectName(alert.projectId)}</td>

                  <td>
                    <span className={`type-badge ${alert.item_type}`}>
                      {alert.item_type}
                    </span>
                  </td>

                  <td>
                    <span className={`status-badge ${alert.status}`}>
                      {alert.status === "active" ? "Activa" : "Resuelta"}
                    </span>
                  </td>

                  <td>{new Date(alert.created_at).toLocaleDateString()}</td>

                  <td>
                    <button
                      className="btn-view"
                      onClick={() =>
                        router.push(`/supervisor/alerts/${alert.id}`)
                      }
                    >
                      Ver detalle
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
