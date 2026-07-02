"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  getValidationItem,
  approveValidation,
  rejectValidation,
  type ValidationItem,
} from "@/src/lib/api/validation";
import { getProjects, type Project } from "@/src/lib/api/projects";

import "@/styles/supervisor-validation-detail.css";

export default function SupervisorValidationDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = Number(params.id);

  const [item, setItem] = useState<ValidationItem | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [comment, setComment] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);

  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  useEffect(() => {
    loadData();
  }, [id]);

  async function loadData() {
    try {
      setLoading(true);
      const [data, projectsData] = await Promise.all([
        getValidationItem(id),
        getProjects(),
      ]);

      setItem(data);
      setProjects(projectsData);
    } catch (err: any) {
      setError(err.message || "Error al cargar validación");
    } finally {
      setLoading(false);
    }
  }

  function safe(v: any, fallback = "—") {
    return v !== null && v !== undefined ? v : fallback;
  }

  function getProjectName(id: number) {
    return projects.find((p) => p.id === id)?.name || `Proyecto #${id}`;
  }

  /* ============================================================
     APROBAR
  ============================================================ */
  async function handleApprove() {
    if (!item) return;

    try {
      setSubmitting(true);
      const updated = await approveValidation(
        item.id,
        comment ? { comment } : undefined
      );
      setItem(updated);
      setComment("");
      showToast("Validación aprobada correctamente", "success");
    } catch (err: any) {
      showToast(err.message || "Error al aprobar", "error");
    } finally {
      setSubmitting(false);
    }
  }

  /* ============================================================
     RECHAZAR — CON VALIDACIÓN UX
  ============================================================ */
  async function handleReject() {
    const text = comment.trim();

    if (text.length === 0) {
      showToast("Debe ingresar un comentario.", "error");
      return;
    }

    if (text.length < 3) {
      showToast("El comentario debe tener al menos 3 caracteres.", "error");
      return;
    }

    if (!item) return;

    try {
      setSubmitting(true);
      const updated = await rejectValidation(item.id, { comment: text });
      setItem(updated);
      setComment("");
      setShowRejectForm(false);
      showToast("Validación rechazada correctamente", "success");
    } catch (err: any) {
      showToast(err.message || "Error al rechazar", "error");
    } finally {
      setSubmitting(false);
    }
  }

  /* ============================================================
     TOAST
  ============================================================ */
  function showToast(message: string, type: "success" | "error") {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }

  /* ============================================================
     ESTADOS BÁSICOS
  ============================================================ */
  if (loading)
    return (
      <div className="validation-page">
        <div className="loading-box">Cargando validación...</div>
      </div>
    );

  if (error || !item)
    return (
      <div className="validation-page">
        <div className="error-box">
          Error: {error || "Validación no encontrada"}
        </div>
      </div>
    );

  const status = item.status;
  const canAct = ["pending", "under_review", "approved_partial"].includes(
    status
  );

  /* ============================================================
     RENDER PRINCIPAL
  ============================================================ */
  return (
    <div className="validation-page">
      {/* ------------------------------------- */}
      {/* HEADER */}
      {/* ------------------------------------- */}
      <div className="page-header">
        <h1 className="page-title">
          Revisión de {item.type.charAt(0).toUpperCase() + item.type.slice(1)} —{" "}
          {getProjectName(item.project_id)}
        </h1>

        <button
          className="btn-back"
          onClick={() => router.push("/supervisor/validation")}
        >
          ← Volver
        </button>
      </div>

      {/* ------------------------------------- */}
      {/* CARD PRINCIPAL */}
      {/* ------------------------------------- */}
      <div className="card">
        <div className="detail-header">
          <span className={`type-badge type-${item.type}`}>{item.type}</span>
          <span className={`status-badge status-${status}`}>
            {status.replace(/_/g, " ")}
          </span>
        </div>

        {/* INFORMACIÓN */}
        <div className="section">
          <h2 className="section-title">Información General</h2>

          <div className="info-grid">
            <div className="info-item">
              <label>Proyecto</label>
              <p>{getProjectName(item.project_id)}</p>
            </div>

            <div className="info-item">
              <label>Item Relacionado</label>
              <p>#{item.related_id}</p>
            </div>

            <div className="info-item">
              <label>Creado</label>
              <p>{new Date(item.created_at).toLocaleString()}</p>
            </div>

            <div className="info-item">
              <label>Actualizado</label>
              <p>{new Date(item.updated_at).toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* PROGRESO */}
        <div className="section">
          <h2 className="section-title">Progreso W-of-N</h2>

          <div className="progress-large">
            <div
              className="progress-fill-large"
              style={{
                width: `${
                  (item.approvals_count / item.required_approvals) * 100
                }%`,
              }}
            ></div>
          </div>

          <div className="progress-text">
            {item.approvals_count} / {item.required_approvals} aprobaciones
          </div>

          {item.rejections_count > 0 && (
            <div className="reject-alert">
              ⚠ {item.rejections_count} rechazo(s)
            </div>
          )}
        </div>

        {/* COMENTARIO EXISTENTE */}
        {item.supervisor_comment && (
          <div className="section">
            <h2 className="section-title">Comentario del Supervisor</h2>
            <div className="comment-box">{item.supervisor_comment}</div>
          </div>
        )}

        {/* HASHES */}
        <div className="section">
          <h2 className="section-title">Hashes Blockchain</h2>

          <div className="hash-grid">
            <div className="hash-item">
              <label>Content Hash</label>
              <span>{item.content_hash}</span>
            </div>
            <div className="hash-item">
              <label>Previous Hash</label>
              <span>{item.previous_hash}</span>
            </div>
          </div>
        </div>

        {/* VALIDACIÓN FINAL */}
        {item.validated_by && (
          <div className="section">
            <h2 className="section-title">Validación Final</h2>

            <div className="info-grid">
              <div className="info-item">
                <label>Validado por</label>
                <p>{item.validated_by}</p>
              </div>

              <div className="info-item">
                <label>Fecha</label>
                <p>
                  {item.validated_at
                    ? new Date(item.validated_at).toLocaleString()
                    : "—"}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ACCIONES */}
        {canAct && (
          <div className="section">
            <h2 className="section-title">Acciones</h2>

            {!showRejectForm ? (
              <div className="actions-row">
                <button
                  className="btn-approve"
                  onClick={handleApprove}
                  disabled={submitting}
                >
                  Aprobar
                </button>

                <button
                  className="btn-reject"
                  onClick={() => setShowRejectForm(true)}
                >
                  Rechazar
                </button>
              </div>
            ) : (
              <div className="reject-form">
                <label>Comentario obligatorio</label>

                <textarea
                  className={
                    comment.trim().length < 3 ? "invalid-textarea" : ""
                  }
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={4}
                  placeholder="Explica por qué rechazas esta validación…"
                />

                <div className="actions-row">
                  <button
                    className="btn-reject"
                    onClick={handleReject}
                    disabled={submitting || comment.trim().length < 3}
                  >
                    Confirmar rechazo
                  </button>

                  <button
                    className="btn-secondary"
                    onClick={() => {
                      setShowRejectForm(false);
                      setComment("");
                    }}
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* HISTORIAL */}
        <div className="section">
          <h2 className="section-title">Historial</h2>

          {!item.records?.length ? (
            <div className="empty-box">No hay registros</div>
          ) : (
            <div className="timeline">
              {item.records.map((r) => (
                <div key={r.id} className="timeline-item">
                  <div className={`timeline-marker ${r.decision}`} />

                  <div className="timeline-content">
                    <div className="timeline-header">
                      <span className="validator-name">{r.validator}</span>
                      <span className="validator-role">{r.validator_role}</span>

                      <span className={`decision-badge ${r.decision}`}>
                        {r.decision === "approve" ? "Aprobado" : "Rechazado"}
                      </span>
                    </div>

                    {r.comment && (
                      <p className="timeline-comment">{r.comment}</p>
                    )}

                    <div className="timeline-footer">
                      <span>{new Date(r.created_at).toLocaleString()}</span>
                      <span className="hash-small">
                        {r.content_hash.substring(0, 16)}…
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* TOAST */}
      {toast && <div className={`toast ${toast.type}`}>{toast.message}</div>}
    </div>
  );
}
