"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { getAlerts, type Alert, type AlertFilters } from "@/src/lib/api/alerts";
import { getProjects, type Project } from "@/src/lib/api/projects";

// Estilos globales usados en otros módulos
import "@/styles/projects-admin.css";
import "@/styles/table.css";
import "@/styles/alert-admin.css"; // Tu CSS nuevo pulido

export default function AlertsListPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const safe = (v: any) => (v ? String(v) : "");

  // === Filters (persisten en URL) ===
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

  // Load alerts + projects
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

  function getProjectName(id: number): string {
    return projects.find((p) => p.id === id)?.name || `Proyecto #${id}`;
  }

  // Búsqueda por texto
  const filteredAlerts = (Array.isArray(alerts) ? alerts : []).filter((alert) =>
    searchQuery
      ? alert.title.toLowerCase().includes(searchQuery.toLowerCase())
      : true
  );

  // ===============================
  //   STATES: LOADING / ERROR
  // ===============================
  if (loading) {
    return (
      <div className="projects-container">
        <div className="table-loading">Cargando alertas...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="projects-container">
        <div className="table-empty">Error: {error}</div>
      </div>
    );
  }

  // ===============================
  //   UI: LISTA DE ALERTAS
  // ===============================
  return (
    <div className="projects-container">
      {/* TITLE */}
      <div className="projects-header">
        <div>
          <h1 className="alerts-title">Monitoreo de Alertas</h1>
          <p className="projects-subtitle">
            Validación automática del sistema.
          </p>
        </div>
      </div>

      {/* FILTER BAR */}
      <div className="alerts-filters">
        {/* SEVERIDAD */}
        <div className="filter-group">
          <label className="filter-label">Severidad:</label>
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
          <label className="filter-label">Estado:</label>
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
          <label className="filter-label">Tipo:</label>
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
          <label className="filter-label">Proyecto:</label>
          <select
            className="filter-select"
            value={filterProject}
            onChange={(e) => setFilterProject(e.target.value)}
          >
            <option value="all">Todos</option>
            {(Array.isArray(projects) ? projects : []).map((p) => (
              <option key={p.id} value={p.id.toString()}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        {/* TEXTO */}
        <div className="filter-group">
          <label className="filter-label">Buscar:</label>
          <input
            type="text"
            className="filter-input"
            placeholder="Buscar por título..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* TABLE */}
      <div className="table-container">
        <div className="table-wrapper">
          <table className="data-table">
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
                  <td colSpan={8} className="table-empty">
                    No hay alertas disponibles
                  </td>
                </tr>
              ) : (
                filteredAlerts.map((alert) => (
                  <tr key={alert.id}>
                    <td>
                      <span
                        className={`alert-severity-badge ${alert.severity}`}
                      >
                        {alert.severity === "critical" && "Crítica"}
                        {alert.severity === "warning" && "Advertencia"}
                        {alert.severity === "info" && "Info"}
                      </span>
                    </td>

                    <td>
                      <strong>{safe(alert.title)}</strong>
                    </td>

                    <td className="alert-message-cell">
                      {safe(alert.message).substring(0, 60)}...
                    </td>

                    <td>{getProjectName(alert.projectId)}</td>

                    <td>
                      <span className={`alert-type-badge ${alert.item_type}`}>
                        {alert.item_type}
                      </span>
                    </td>

                    <td>
                      <span className={`alert-status-badge ${alert.status}`}>
                        {alert.status === "active" ? "Activa" : "Resuelta"}
                      </span>
                    </td>

                    <td>
                      {new Date(alert.created_at).toLocaleDateString("es-PE")}
                    </td>

                    <td>
                      <button
                        className="btn-outline-primary"
                        onClick={() => router.push(`/admin/alerts/${alert.id}`)}
                      >
                        Ver Detalle
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
