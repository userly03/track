"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

// IMPORTS
import { getProjects, type Project } from "@/src/lib/api/projects";
import { getDashboardKPI, type DashboardKPI } from "@/src/lib/api/dashboard";

import "@/styles/projects-admin.css";
import "@/styles/table.css";
import "@/styles/kpi.css";

export default function ProjectsPage() {
  const router = useRouter();

  const [projects, setProjects] = useState<Project[]>([]);
  const [dashboard, setDashboard] = useState<DashboardKPI | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);

      const [projectsData, dashboardData] = await Promise.all([
        getProjects(),
        getDashboardKPI(),
      ]);

      // 🔥 Asegurar datos siempre válidos
      const safeDashboard: DashboardKPI = {
        total_projects: dashboardData?.total_projects ?? 0,
        delayed_projects: dashboardData?.delayed_projects ?? 0,

        total_alerts_critical: dashboardData?.total_alerts_critical ?? 0,
        total_alerts_warning: dashboardData?.total_alerts_warning ?? 0,
        total_alerts_info: dashboardData?.total_alerts_info ?? 0,

        average_health_score: dashboardData?.average_health_score ?? 0,
        average_risk_score: dashboardData?.average_risk_score ?? 0,

        projects: Array.isArray(dashboardData?.projects)
          ? dashboardData.projects
          : [],
      };

      setProjects(Array.isArray(projectsData) ? projectsData : []);
      setDashboard(safeDashboard);
    } catch (err: any) {
      setError(err.message || "Error al cargar datos");
    } finally {
      setLoading(false);
    }
  }

  // ============================
  // UI STATES
  // ============================

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="page-loading">Cargando proyectos...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-container">
        <div className="page-error">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      {/* HEADER */}
      <div className="dashboard-header projects-header">
        <div>
          <h1 className="dashboard-title">Gestión de Proyectos</h1>
          <p className="dashboard-subtitle">
            Control general de los proyectos registrados en el sistema.
          </p>
        </div>

        <button
          className="primary-button"
          onClick={() => router.push("/admin/projects/new")}
        >
          + Nuevo proyecto
        </button>
      </div>

      {/* KPI PRINCIPALES */}
      {dashboard && (
        <section className="kpi-cards-grid">
          {/* Salud promedio */}
          <div className="kpi-card green">
            <div className="kpi-card-label">Performance General</div>
            <div className="kpi-card-value">
              {dashboard.average_health_score.toFixed(1)}
            </div>
            <div className="kpi-card-trend">
              Promedio de desempeño de los proyectos
            </div>
          </div>

          {/* Total proyectos */}
          <div className="kpi-card blue">
            <div className="kpi-card-label">Total Proyectos</div>
            <div className="kpi-card-value">{dashboard.total_projects}</div>
            <div className="kpi-card-trend">Registrados en el sistema</div>
          </div>

          {/* Retrasados */}
          <div className="kpi-card red">
            <div className="kpi-card-label">Retrasados</div>
            <div className="kpi-card-value">{dashboard.delayed_projects}</div>
            <div className="kpi-card-trend">Con retraso</div>
          </div>

          {/* Alertas críticas */}
          <div className="kpi-card yellow">
            <div className="kpi-card-label">Alertas críticas</div>
            <div className="kpi-card-value">
              {dashboard.total_alerts_critical}
            </div>
            <div className="kpi-card-trend">Requieren atención inmediata</div>
          </div>
        </section>
      )}

      {/* TABLA PRINCIPAL */}
      <section className="dashboard-section">
        <h2 className="section-title">
          Lista de proyectos ({projects.length})
        </h2>

        <div className="table-wrapper">
          <table className="dashboard-table">
            <thead>
              <tr>
                <th>Código</th>
                <th>Nombre</th>
                <th>Ubicación</th>
                <th>Inicio</th>
                <th>Fin estimado</th>
                <th>Progreso</th>
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>

            <tbody>
              {projects.length === 0 ? (
                <tr>
                  <td colSpan={8} className="table-empty">
                    No hay proyectos registrados.
                  </td>
                </tr>
              ) : (
                projects.map((project) => (
                  <tr key={project.id}>
                    <td>
                      <span className="project-code">{project.code}</span>
                    </td>

                    <td>{project.name}</td>
                    <td>{project.location}</td>

                    <td>{new Date(project.start_date).toLocaleDateString()}</td>

                    <td>
                      {new Date(
                        project.end_date_estimated
                      ).toLocaleDateString()}
                    </td>

                    <td>
                      <div className="progress-container">
                        <div className="progress-bar">
                          <div
                            className="progress-fill"
                            style={{ width: `${project.progress}%` }}
                          />
                        </div>

                        <span className="progress-label">
                          {Number(project.progress).toFixed(1)}%
                        </span>
                      </div>
                    </td>

                    <td>
                      <span
                        className={`status-badge ${project.status.toLowerCase()}`}
                      >
                        {project.status}
                      </span>
                    </td>

                    <td>
                      <div className="table-actions">
                        <button
                          className="btn-action primary"
                          onClick={() =>
                            router.push(`/admin/projects/${project.id}`)
                          }
                        >
                          Ver
                        </button>

                        <button
                          className="btn-action secondary"
                          onClick={() =>
                            router.push(`/admin/projects/${project.id}/kpi`)
                          }
                        >
                          KPI
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
