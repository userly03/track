"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getProjects, type Project } from "@/src/lib/api/projects";

import "@/styles/supervisor-projects.css";

export default function SupervisorProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);

      const result = await getProjects();

      // Garantizar siempre un array
      const safeProjects = Array.isArray(result)
        ? result
        : Array.isArray((result as any)?.projects)
        ? (result as any).projects
        : [];

      setProjects(safeProjects);
    } catch (err: any) {
      setError(err.message || "Error al cargar datos");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="projects-container">
        <div className="table-loading">Cargando proyectos...</div>
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

  return (
    <div className="projects-container">
      <div className="projects-header">
        <h1 className="projects-title">Proyectos Asignados</h1>
        <p className="projects-subtitle">
          Lista de proyectos asignados a tu supervisión.
        </p>
      </div>

      <div className="table-container">
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Código</th>
                <th>Nombre</th>
                <th>Ubicación</th>
                <th>Inicio</th>
                <th>Fin Estimado</th>
                <th>Progreso</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>

            <tbody>
              {projects.length === 0 ? (
                <tr>
                  <td colSpan={8} className="table-empty">
                    No hay proyectos asignados
                  </td>
                </tr>
              ) : (
                projects.map((project) => (
                  <tr key={project.id}>
                    <td>{project.code}</td>
                    <td>{project.name}</td>
                    <td>{project.location}</td>

                    <td>
                      {new Date(project.start_date).toLocaleDateString("es-PE")}
                    </td>

                    <td>
                      {new Date(project.end_date_estimated).toLocaleDateString(
                        "es-PE"
                      )}
                    </td>

                    {/* Progreso */}
                    <td>
                      <div className="progress-wrapper">
                        <div className="progress-label">
                          {(Number(project.progress) || 0).toFixed(1)}%
                        </div>
                        <div className="progress-bar-container">
                          <div
                            className="progress-bar-fill"
                            style={{
                              width: `${Number(project.progress) || 0}%`,
                            }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Estado */}
                    <td>
                      <span
                        className={`status-badge ${project.status.toLowerCase()}`}
                      >
                        {project.status}
                      </span>
                    </td>

                    {/* Acciones */}
                    <td>
                      <div className="projects-actions">
                        <button
                          className="btn-view"
                          onClick={() =>
                            router.push(`/supervisor/projects/${project.id}`)
                          }
                        >
                          Ver
                        </button>

                        <button
                          className="btn-kpi"
                          onClick={() =>
                            router.push(
                              `/supervisor/projects/${project.id}/kpi`
                            )
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
      </div>
    </div>
  );
}
