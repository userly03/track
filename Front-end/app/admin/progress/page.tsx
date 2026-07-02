"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import {
  getProgressReports,
  type ProgressReport,
} from "@/src/lib/api/progress";

import { getProjects, type Project } from "@/src/lib/api/projects";

import "@/styles/projects-admin.css";
import "@/styles/table.css";
import "@/styles/progress-admin.css";

export default function ProgressReportsPage() {
  const router = useRouter();

  const [reports, setReports] = useState<ProgressReport[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [filterProjectId, setFilterProjectId] = useState<string>("");

  const [sortBy, setSortBy] = useState<"date" | "percentage">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  /* =====================================================================================
     CARGA INICIAL
  ===================================================================================== */
  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);

      const [reportsData, projectsData] = await Promise.all([
        getProgressReports(),
        getProjects(),
      ]);

      setReports(Array.isArray(reportsData) ? reportsData : []);
      setProjects(Array.isArray(projectsData) ? projectsData : []);
    } catch (err: any) {
      setError(err.message || "Error al cargar reportes");
    } finally {
      setLoading(false);
    }
  }

  /* =====================================================================================
     FILTRAR POR PROYECTO
  ===================================================================================== */
  useEffect(() => {
    if (filterProjectId) {
      loadReportsForProject(Number(filterProjectId));
    } else {
      loadReports();
    }
  }, [filterProjectId]);

  async function loadReports() {
    try {
      const data = await getProgressReports();
      setReports(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err.message || "Error al cargar reportes");
    }
  }

  async function loadReportsForProject(projectId: number) {
    try {
      const data = await getProgressReports(projectId);
      setReports(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err.message || "Error al cargar reportes");
    }
  }

  /* =====================================================================================
     HELPERS
  ===================================================================================== */
  const safeProjects = Array.isArray(projects) ? projects : [];

  function getProjectName(id: number) {
    return safeProjects.find((p) => p.id === id)?.name || `Proyecto #${id}`;
  }

  function getSortedReports() {
    const sorted = [...reports];

    return sorted.sort((a, b) => {
      if (sortBy === "date") {
        const d1 = new Date(a.date).getTime();
        const d2 = new Date(b.date).getTime();
        return sortOrder === "asc" ? d1 - d2 : d2 - d1;
      }
      return sortOrder === "asc"
        ? a.percentage - b.percentage
        : b.percentage - a.percentage;
    });
  }

  function toggleSort(field: "date" | "percentage") {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
  }

  /* =====================================================================================
     UI ESTADOS
  ===================================================================================== */
  if (loading) {
    return (
      <div className="projects-container">
        <div className="table-loading">Cargando reportes de progreso...</div>
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

  /* =====================================================================================
     UI RENDER
  ===================================================================================== */
  return (
    <div className="projects-container">
      {/* HEADER */}
      <div className="projects-header">
        <h1 className="projects-title">Reportes de Progreso</h1>

        <button
          className="btn-primary"
          onClick={() => router.push("/admin/progress/new")}
        >
          + Nuevo Reporte
        </button>
      </div>

      {/* FILTROS */}
      <div className="progress-filters">
        <div className="filter-group">
          <label className="filter-label">Filtrar por proyecto</label>

          <select
            className="filter-select"
            value={filterProjectId}
            onChange={(e) => setFilterProjectId(e.target.value)}
          >
            <option value="">Todos los proyectos</option>

            {safeProjects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* TABLA */}
      <div className="table-container">
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Proyecto</th>
                <th>Descripción</th>

                <th
                  className="sortable-header"
                  onClick={() => toggleSort("percentage")}
                >
                  Porcentaje{" "}
                  {sortBy === "percentage" && (sortOrder === "asc" ? "↑" : "↓")}
                </th>

                <th
                  className="sortable-header"
                  onClick={() => toggleSort("date")}
                >
                  Fecha {sortBy === "date" && (sortOrder === "asc" ? "↑" : "↓")}
                </th>

                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>

            <tbody>
              {getSortedReports().length === 0 ? (
                <tr>
                  <td colSpan={6} className="table-empty">
                    No hay reportes de progreso registrados
                  </td>
                </tr>
              ) : (
                getSortedReports().map((report) => (
                  <tr key={report.id}>
                    <td>{getProjectName(report.projectId)}</td>

                    <td>{report.description}</td>

                    <td>
                      <div className="progress-percentage-cell">
                        <div className="progress-bar-mini">
                          <div
                            className="progress-bar-fill"
                            style={{ width: `${report.percentage}%` }}
                          />
                        </div>
                        <span className="progress-percentage-text">
                          {report.percentage}%
                        </span>
                      </div>
                    </td>

                    <td>{new Date(report.date).toLocaleDateString()}</td>

                    <td>
                      <span
                        className={`progress-status-badge ${report.status}`}
                      >
                        {report.status}
                      </span>
                    </td>

                    <td>
                      <button
                        className="btn-secondary"
                        onClick={() =>
                          router.push(`/admin/progress/${report.id}`)
                        }
                      >
                        Ver / Editar
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
