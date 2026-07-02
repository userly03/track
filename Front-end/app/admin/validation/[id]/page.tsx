"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";

import {
  getValidationItem,
  type ValidationItem,
} from "@/src/lib/api/validation";

import { getProjects, type Project } from "@/src/lib/api/projects";

import "@/styles/projects-admin.css";
import "@/styles/forms.css";
import "@/styles/validation-admin.css";

export default function ValidationDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = Number(params?.id || 0);

  const [item, setItem] = useState<ValidationItem | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // ---------------------------------------------
  // LOAD DATA
  // ---------------------------------------------
  useEffect(() => {
    loadData();
  }, [id]);

  async function loadData() {
    try {
      setLoading(true);
      const [itemData, projectData] = await Promise.all([
        getValidationItem(id),
        getProjects(),
      ]);

      setItem(itemData);
      setProjects(projectData);
    } catch (err: any) {
      setError(err.message || "Error al cargar validación");
    } finally {
      setLoading(false);
    }
  }

  // ---------------------------------------------
  // HELPERS
  // ---------------------------------------------
  function getProjectName(projectId: number): string {
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

  function getProgressWidth(a: number, b: number) {
    if (!b || b <= 0) return "0%";
    return `${Math.min((a / b) * 100, 100)}%`;
  }

  // ---------------------------------------------
  // STATES: LOADING / ERROR
  // ---------------------------------------------
  if (loading) {
    return <div className="page-loading">Cargando detalle...</div>;
  }

  if (error || !item) {
    return (
      <div className="page-error">
        Error: {error || "Validación no encontrada"}
      </div>
    );
  }

  const PROYECTO = getProjectName(item.project_id);

  // ---------------------------------------------
  // UI FINAL (ADMIN READ ONLY)
  // ---------------------------------------------
  return (
    <div className="validation-detail-container">
      {/* HEADER SUPERIOR */}
      <div className="validation-detail-header-top">
        <h1 className="validation-detail-title">
          Validación del Proyecto: {PROYECTO}
        </h1>

        <button
          className="btn-back"
          onClick={() => router.push("/admin/validation")}
        >
          ← Volver
        </button>
      </div>

      <div className="validation-detail-card">
        {/* BADGES */}
        <div className="validation-detail-status-row">
          <span className={`validation-type-badge ${item.type}`}>
            {
              {
                purchase: "COMPRA",
                delivery: "ENTREGA",
                progress: "AVANCE",
                document: "DOCUMENTO",
              }[item.type]
            }
          </span>

          <span className={`validation-status-badge ${item.status}`}>
            {
              {
                pending: "PENDIENTE",
                under_review: "EN REVISIÓN",
                approved_partial: "APROBACIÓN PARCIAL",
                approved: "APROBADO",
                rejected: "RECHAZADO",
                auto_closed: "CERRADO AUTOMÁTICO",
              }[item.status]
            }
          </span>
        </div>

        {/* INFORMACIÓN GENERAL */}
        <section className="validation-section">
          <h3 className="validation-section-title">Información General</h3>

          <div className="validation-info-grid">
            <div className="info-item">
              <span className="label">Proyecto:</span>
              <span className="value">{PROYECTO}</span>
            </div>

            <div className="info-item">
              <span className="label">Elemento Validado:</span>
              <span className="value">
                {
                  {
                    purchase: `Compra #${item.related_id}`,
                    delivery: `Entrega #${item.related_id}`,
                    progress: `Avance #${item.related_id}`,
                    document: `Documento #${item.related_id}`,
                  }[item.type]
                }
              </span>
            </div>

            <div className="info-item">
              <span className="label">Creado:</span>
              <span className="value">{safeDate(item.created_at)}</span>
            </div>

            <div className="info-item">
              <span className="label">Actualizado:</span>
              <span className="value">{safeDate(item.updated_at)}</span>
            </div>
          </div>
        </section>

        {/* PROGRESO */}
        <section className="validation-section">
          <h3 className="validation-section-title">
            Estado de Aprobación (Regla de Revisión Múltiple)
          </h3>
          <p className="validation-help-text">
            Este proceso requiere la aprobación de múltiples validadores
            autorizados.
          </p>

          <div className="validation-wn-grid">
            <div className="stat-card approve">
              <span className="stat-value">{item.approvals_count}</span>
              <span className="stat-label">Aprobaciones</span>
            </div>

            <div className="stat-card required">
              <span className="stat-value">{item.required_approvals}</span>
              <span className="stat-label">Requeridas</span>
            </div>

            <div className="stat-card reject">
              <span className="stat-value">{item.rejections_count}</span>
              <span className="stat-label">Rechazos</span>
            </div>
          </div>

          <div className="validation-progress-large">
            <div
              className="validation-progress-fill-large"
              style={{
                width: getProgressWidth(
                  item.approvals_count,
                  item.required_approvals
                ),
              }}
            />
          </div>
        </section>

        {/* METADATA */}
        {Object.keys(item.metadata).length > 0 && (
          <section className="validation-section">
            <h3 className="validation-section-title">Metadata</h3>
            <pre className="validation-metadata">
              {JSON.stringify(item.metadata, null, 2)}
            </pre>
          </section>
        )}

        {/* HASHES */}
        <section className="validation-section">
          <h3 className="validation-section-title">Hashes Blockchain</h3>

          <div className="hashes-grid">
            <div className="hash-item">
              <span className="label">Content Hash:</span>
              <span className="hash">{item.content_hash}</span>
            </div>

            <div className="hash-item">
              <span className="label">Previous Hash:</span>
              <span className="hash">{item.previous_hash}</span>
            </div>
          </div>
        </section>

        {/* HISTORIAL */}
        <section className="validation-section">
          <h3 className="validation-section-title">Historial</h3>

          {item.records.length === 0 ? (
            <div className="table-empty">No hay historial aún</div>
          ) : (
            <div className="validation-timeline">
              {item.records.map((record) => (
                <div key={record.id} className="timeline-item">
                  <div className={`timeline-marker ${record.decision}`} />

                  <div className="timeline-body">
                    <div className="timeline-header">
                      <span className="timeline-user">{record.validator}</span>
                      <span className="timeline-role">
                        {record.validator_role}
                      </span>

                      <span className={`timeline-decision ${record.decision}`}>
                        {record.decision === "approve"
                          ? "Aprobado"
                          : "Rechazado"}
                      </span>
                    </div>

                    {record.comment && (
                      <div className="timeline-comment">{record.comment}</div>
                    )}

                    <div className="timeline-footer">
                      <span>{safeDate(record.created_at)}</span>
                      <span className="timeline-hash">
                        {record.content_hash.substring(0, 12)}...
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
