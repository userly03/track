"use client";

import { useAuth } from "@/src/lib/auth/use-auth";
import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import {
  getDashboardKPI,
  type DashboardKPI,
  type ProjectKPI,
} from "@/src/lib/api/dashboard";

import "@/styles/supervisor-dashboard.css";

export default function SupervisorHome() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const [dashboard, setDashboard] = useState<DashboardKPI | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterDelayed, setFilterDelayed] = useState<boolean>(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const data = await getDashboardKPI();
      setDashboard(data);
    } catch (err: any) {
      setError(err.message || "Error al cargar dashboard");
    } finally {
      setLoading(false);
    }
  }

  function handleSearch(e: FormEvent) {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/supervisor/search?q=${encodeURIComponent(searchQuery)}`);
    }
  }

  /** FILTROS –– EVITAR CRASH SI NO HAY PROJECTS */
  function getFilteredProjects(): ProjectKPI[] {
    if (!dashboard || !dashboard.projects) return [];

    return dashboard.projects.filter((p) => {
      const q = searchQuery.trim().toLowerCase();

      if (q) {
        const matches =
          p.project_code.toLowerCase().includes(q) ||
          p.project_name.toLowerCase().includes(q);
        if (!matches) return false;
      }

      if (filterStatus !== "all" && p.status !== filterStatus) return false;
      if (filterDelayed && p.delay_days <= 0) return false;

      return true;
    });
  }

  if (!user) return <div className="sv-loading">Cargando usuario...</div>;

  if (loading)
    return <div className="sv-dashboard-loading">Cargando dashboard...</div>;

  if (error) return <div className="sv-dashboard-error">Error: {error}</div>;

  const filtered = getFilteredProjects();

  const totalAlerts = filtered.reduce(
    (sum, p) => sum + p.alerts.critical + p.alerts.warning + p.alerts.info,
    0
  );

  const avgHealth =
    filtered.length > 0
      ? filtered.reduce((s, p) => s + p.health_score, 0) / filtered.length
      : 0;

  return (
    <div className="sv-dashboard-page">
      {/* HEADER */}
      <div className="sv-header">
        <h1 className="sv-title">Panel de Supervisor</h1>
        <button className="sv-logout-btn" onClick={logout}>
          Cerrar sesión
        </button>
      </div>

      {/* BIENVENIDA */}
      <div className="sv-card welcome">
        <h2 className="sv-card-title">Bienvenido, {user.username}</h2>
        <p className="sv-card-desc">
          Supervisa tus proyectos, monitorea alertas y revisa validaciones de
          obra.
        </p>
      </div>

      {/* KPI CARDS */}
      <div className="sv-kpi-grid">
        <div className="sv-kpi-card primary">
          <span className="sv-kpi-label">Mis Proyectos</span>
          <span className="sv-kpi-value">{filtered.length}</span>
        </div>

        <div className="sv-kpi-card danger">
          <span className="sv-kpi-label">Retrasados</span>
          <span className="sv-kpi-value">
            {filtered.filter((p) => p.delay_days > 0).length}
          </span>
        </div>

        <div className="sv-kpi-card warning">
          <span className="sv-kpi-label">Alertas activas</span>
          <span className="sv-kpi-value">{totalAlerts}</span>
        </div>

        <div className="sv-kpi-card success">
          <span className="sv-kpi-label">Health Promedio</span>
          <span className="sv-kpi-value">{avgHealth.toFixed(1)}</span>
        </div>
      </div>

      {/* BUSCADOR */}
      <form onSubmit={handleSearch} className="sv-search-form">
        <input
          type="text"
          placeholder="Buscar proyectos…"
          value={searchQuery}
          className="sv-search-input"
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <button
          type="submit"
          className="s
v-btn primary"
        >
          Buscar
        </button>
      </form>

      {/* FILTROS */}
      <div className="sv-filter-row">
        <div className="sv-filter-group">
          <label>Estado:</label>
          <select
            className="sv-filter-select"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="all">Todos</option>
            <option value="active">Activo</option>
            <option value="completed">Completado</option>
            <option value="paused">Pausado</option>
          </select>
        </div>

        <div className="sv-filter-group checkbox">
          <label>
            <input
              type="checkbox"
              checked={filterDelayed}
              onChange={(e) => setFilterDelayed(e.target.checked)}
            />
            <span>Solo retrasados</span>
          </label>
        </div>
      </div>

      {/* TABLA PRINCIPAL */}
      <div className="sv-card table">
        <h2 className="sv-section-title">Mis Proyectos ({filtered.length})</h2>

        <div className="sv-table-wrapper">
          <table className="sv-table">
            <thead>
              <tr>
                <th>Código</th>
                <th>Proyecto</th>
                <th>Avance Físico</th>
                <th>Avance Financiero</th>
                <th>Retraso</th>
                <th>Health</th>
                <th>Alertas</th>
                <th></th>
              </tr>
            </thead>

            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="sv-table-empty">
                    No hay proyectos asignados
                  </td>
                </tr>
              ) : (
                filtered.map((p) => (
                  <tr key={p.project_id}>
                    <td>
                      <span className="sv-proj-code">{p.project_code}</span>
                    </td>

                    <td>
                      <span className="sv-proj-name">{p.project_name}</span>
                    </td>

                    <td>
                      <Progress value={p.physical_progress} />
                    </td>

                    <td>
                      <Progress value={p.financial_progress} type="financial" />
                    </td>

                    <td>
                      <span
                        className={`sv-delay-badge ${
                          p.delay_days > 0 ? "delayed" : "on-time"
                        }`}
                      >
                        {p.delay_days > 0
                          ? `+${p.delay_days} días`
                          : "A tiempo"}
                      </span>
                    </td>

                    <td>
                      <span
                        className={`sv-health ${getHealthClass(
                          p.health_score
                        )}`}
                      >
                        {p.health_score.toFixed(0)}
                      </span>
                    </td>

                    <td>
                      <div className="sv-alert-dots">
                        {p.alerts.critical > 0 && (
                          <span className="dot critical">
                            {p.alerts.critical}
                          </span>
                        )}
                        {p.alerts.warning > 0 && (
                          <span className="dot warning">
                            {p.alerts.warning}
                          </span>
                        )}
                        {p.alerts.info > 0 && (
                          <span className="dot info">{p.alerts.info}</span>
                        )}
                      </div>
                    </td>

                    <td>
                      <button
                        className="sv-btn small primary"
                        onClick={() =>
                          router.push(`/supervisor/projects/${p.project_id}`)
                        }
                      >
                        Ver
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

/* COMPONENTE PROGRESS BAR */
function Progress({
  value,
  type = "normal",
}: {
  value: number;
  type?: string;
}) {
  return (
    <div className="sv-progress">
      <div
        className={`sv-progress-fill ${type}`}
        style={{ width: `${value}%` }}
      />
      <span className="sv-progress-label">{value.toFixed(1)}%</span>
    </div>
  );
}

function getHealthClass(score: number) {
  if (score >= 80) return "excellent";
  if (score >= 60) return "good";
  if (score >= 40) return "warning";
  return "critical";
}
