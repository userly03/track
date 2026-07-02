"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import {
  getValidationItems,
  type ValidationItem,
} from "@/src/lib/api/validation";

import { getProjects, type Project } from "@/src/lib/api/projects";

import "@/styles/projects-admin.css";
import "@/styles/table.css";
import "@/styles/validation-admin.css";

export default function ValidationInboxPage() {
  const router = useRouter();

  const [items, setItems] = useState<ValidationItem[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filtros
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

  function getProjectName(projectId: number) {
    return (
      projects.find((p) => p.id === projectId)?.name || `Proyecto #${projectId}`
    );
  }

  function safeDate(dateString: string) {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return "Fecha inválida";

    return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })}`;
  }

  function readableType(type: string) {
    return {
      purchase: "COMPRA",
      delivery: "ENTREGA",
      progress: "AVANCE",
      document: "DOCUMENTO",
    }[type];
  }

  function readableStatus(status: string) {
    return {
      pending: "PENDIENTE",
      under_review: "EN REVISIÓN",
      approved_partial: "APROBACIÓN PARCIAL",
      approved: "APROBADO",
      rejected: "RECHAZADO",
      auto_closed: "CERRADO AUTOMÁTICO",
    }[status];
  }

  function readableItem(type: string, id: number, items?: ValidationItem[]) {
    // Buscar el item en el arreglo original para obtener info más útil
    const found = items?.find((x) => x.related_id === id && x.type === type);

    // Si existe y tiene un nombre descriptivo, úsalo
    if (found?.related_name) return found.related_name;

    // SI NO existe o no tiene nombre → fallback elegante
    return {
      purchase: `Compra`,
      delivery: `Entrega`,
      progress: `Avance`,
      document: `Documento`,
    }[type];
  }

  function progressWidth(x: number, y: number) {
    if (!y || y <= 0) return "0%";
    return `${Math.min((x / y) * 100, 100)}%`;
  }

  const filteredItems = Array.isArray(items)
    ? items.filter((item) => {
        if (filterType !== "all" && item.type !== filterType) return false;
        if (filterStatus !== "all" && item.status !== filterStatus)
          return false;
        if (filterProject !== "all" && `${item.project_id}` !== filterProject)
          return false;
        return true;
      })
    : [];

  if (loading) {
    return <div className="page-loading">Cargando validaciones...</div>;
  }

  if (error) {
    return <div className="page-error">{error}</div>;
  }

  return (
    <div className="validation-container">
      {/* HEADER */}
      <div className="validation-header">
        <h1 className="validation-title">Bandeja de Validaciones</h1>
        <p className="validation-subtitle">
          Monitoree el estado de las validaciones generadas en los distintos
          módulos del sistema.
          <br />
          (El administrador solo visualiza, no aprueba ni rechaza.)
        </p>
      </div>

      {/* FILTROS */}
      <div className="validation-filters">
        <div className="filter-group">
          <label>Tipo:</label>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="filter-select"
          >
            <option value="all">Todos</option>
            <option value="purchase">Compras</option>
            <option value="delivery">Entregas</option>
            <option value="progress">Avances</option>
            <option value="document">Documentos</option>
          </select>
        </div>

        <div className="filter-group">
          <label>Estado:</label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="filter-select"
          >
            <option value="all">Todos</option>
            <option value="pending">Pendiente</option>
            <option value="under_review">En revisión</option>
            <option value="approved_partial">Aprobado parcial</option>
            <option value="approved">Aprobado</option>
            <option value="rejected">Rechazado</option>
            <option value="auto_closed">Cerrado automático</option>
          </select>
        </div>

        <div className="filter-group">
          <label>Proyecto:</label>
          <select
            value={filterProject}
            onChange={(e) => setFilterProject(e.target.value)}
            className="filter-select"
          >
            <option value="all">Todos</option>
            {(Array.isArray(projects) ? projects : []).map((p) => (
              <option key={p.id} value={p.id.toString()}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* GRID DE VALIDACIONES */}
      <div className="validation-grid">
        {filteredItems.length === 0 ? (
          <div className="table-empty">No hay validaciones disponibles</div>
        ) : (
          filteredItems.map((item) => (
            <div key={item.id} className="validation-card">
              {/* HEADER DEL CARD */}
              <div className="validation-card-header">
                <span className={`validation-type-badge ${item.type}`}>
                  {readableType(item.type)}
                </span>

                <span className={`validation-status-badge ${item.status}`}>
                  {readableStatus(item.status)}
                </span>
              </div>

              {/* CUERPO */}
              <div className="validation-card-body">
                <div className="validation-info-row">
                  <span className="label">Proyecto:</span>
                  <span className="value">
                    {getProjectName(item.project_id)}
                  </span>
                </div>

                <div className="validation-info-row">
                  <span className="label">Elemento:</span>
                  <span className="value">
                    {readableItem(item.type, item.related_id, items)}
                  </span>
                </div>

                {/* PROGRESO */}
                <div className="validation-progress">
                  <div className="validation-progress-bar">
                    <div
                      className="validation-progress-fill"
                      style={{
                        width: progressWidth(
                          item.approvals_count,
                          item.required_approvals
                        ),
                      }}
                    />
                  </div>
                  <div className="validation-progress-text">
                    {item.approvals_count} de {item.required_approvals}{" "}
                    aprobaciones requeridas
                  </div>
                </div>

                {item.rejections_count > 0 && (
                  <div className="validation-rejections">
                    ⚠️ {item.rejections_count} rechazo(s)
                  </div>
                )}

                <div className="validation-date">
                  Registrado el {safeDate(item.created_at)}
                </div>
              </div>

              {/* FOOTER */}
              <div className="validation-card-footer">
                <button
                  className="btn-primary"
                  onClick={() => router.push(`/admin/validation/${item.id}`)}
                >
                  Ver Detalles
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
