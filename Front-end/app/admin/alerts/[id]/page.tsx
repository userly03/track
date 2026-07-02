"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";

import { getAlert, resolveAlert, type Alert } from "@/src/lib/api/alerts";
import { getProjects, type Project } from "@/src/lib/api/projects";
import { useAuth } from "@/src/lib/auth/use-auth";

import "@/styles/alert-admin.css";
import "@/styles/forms.css";
import "@/styles/table.css";

export default function AlertDetailPage() {
  const router = useRouter();
  const params = useParams();

  const { user } = useAuth();

  const alertId = Number(params?.id);

  const [alert, setAlert] = useState<Alert | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [resolving, setResolving] = useState(false);

  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  const safe = (v: any) => (v === null || v === undefined ? "" : v);

  /* ============================
      CARGA DATA
  ============================ */
  useEffect(() => {
    if (!alertId || isNaN(alertId)) {
      setError("ID de alerta inválido");
      setLoading(false);
      return;
    }
    loadData();
  }, [alertId]);

  async function loadData() {
    try {
      setLoading(true);

      const [alertData, projectsData] = await Promise.all([
        getAlert(alertId),
        getProjects(),
      ]);

      setAlert(alertData);
      setProjects(projectsData);
    } catch (err: any) {
      setError(err.message || "Error al cargar alerta");
    } finally {
      setLoading(false);
    }
  }

  function showToast(message: string, type: "success" | "error") {
    setToast({ message, type });
    setTimeout(() => setToast(null), 2600);
  }

  /* ============================
      RESOLVER ALERTA
  ============================ */
  async function handleResolve() {
    if (!alert || user?.role !== "admin") return;

    if (!confirm("¿Estás seguro de marcar esta alerta como resuelta?")) return;

    try {
      setResolving(true);
      const updated = await resolveAlert(alert.id);
      setAlert(updated);
      showToast("Alerta resuelta exitosamente", "success");
    } catch (err: any) {
      showToast(err.message || "Error al resolver alerta", "error");
    } finally {
      setResolving(false);
    }
  }

  function getProjectName(id: number) {
    return projects.find((p) => p.id === id)?.name || `Proyecto #${id}`;
  }

  function getRelatedEntityLink(): string | null {
    if (!alert) return null;

    const routes: Record<string, string> = {
      purchase: "/admin/purchases",
      delivery: "/admin/deliveries",
      progress: "/admin/progress",
      document: "/admin/documents",
    };

    const base = routes[alert.item_type];
    if (!base) return null;

    return `${base}/${alert.item_id}`;
  }

  /* ============================
      LOAD ERROR
  ============================ */

  if (loading) {
    return <div className="page-loading">Cargando alerta...</div>;
  }

  if (error || !alert) {
    return (
      <div className="page-error">Error: {error || "Alerta no encontrada"}</div>
    );
  }

  const relatedLink = getRelatedEntityLink();

  // ====== Procesar metadata para explicación legible ======
  const hasProgressMetadata =
    alert.metadata &&
    typeof alert.metadata === "object" &&
    "physical_progress" in alert.metadata &&
    "financial_progress" in alert.metadata;

  const physical =
    hasProgressMetadata && typeof alert.metadata.physical_progress === "number"
      ? alert.metadata.physical_progress
      : null;

  const financial =
    hasProgressMetadata && typeof alert.metadata.financial_progress === "number"
      ? alert.metadata.financial_progress
      : null;

  let metadataExplanation = "";
  if (hasProgressMetadata && physical !== null && financial !== null) {
    metadataExplanation = `
El avance físico registrado es ${physical}%, mientras que el avance financiero es ${financial}%.
Esto indica que se ha pagado más de lo ejecutado físicamente en la obra, lo cual puede ser un riesgo de sobrefacturación o error en los reportes.`;
  }

  /* ============================
      UI FINAL
  ============================ */

  return (
    <div className="alert-detail-container">
      {/* HEADER */}
      <div className="alert-detail-header-top">
        <h1 className="alerts-title">Detalle de Alerta</h1>

        <button
          className="btn-outline-danger"
          onClick={() => router.push("/admin/alerts")}
        >
          ← Volver
        </button>
      </div>

      {/* CARD PRINCIPAL */}
      <div className="alert-detail-card">
        {/* BADGES */}
        <div className="alert-detail-badges">
          <span className={`alert-severity-badge ${alert.severity}`}>
            {alert.severity === "critical" && "Crítica"}
            {alert.severity === "warning" && "Advertencia"}
            {alert.severity === "info" && "Información"}
          </span>

          <span className={`alert-status-badge ${alert.status}`}>
            {alert.status === "active" ? "Activa" : "Resuelta"}
          </span>
        </div>

        {/* INFO GENERAL */}
        <div className="alert-info-grid">
          <div>
            <label>Título</label>
            <p>{safe(alert.title)}</p>
          </div>

          <div>
            <label>Proyecto</label>
            <p>{getProjectName(alert.projectId)}</p>
          </div>

          <div>
            <label>Tipo</label>
            <span className={`alert-type-badge ${alert.item_type}`}>
              {alert.item_type}
            </span>
          </div>

          <div>
            <label>Elemento ID</label>
            <p>#{alert.item_id}</p>
          </div>

          <div>
            <label>Creada</label>
            <p>{new Date(alert.created_at).toLocaleString("es-PE")}</p>
          </div>

          {alert.resolved_at && (
            <div>
              <label>Resuelta</label>
              <p>{new Date(alert.resolved_at).toLocaleString("es-PE")}</p>
            </div>
          )}
        </div>

        {/* MENSAJE */}
        <div className="alert-message-box">
          <label>Mensaje</label>
          <p>{safe(alert.message)}</p>
        </div>
      </div>

      {/* RESUMEN AUTOMÁTICO (usando metadata) */}
      {alert.metadata && Object.keys(alert.metadata).length > 0 && (
        <div className="alert-detail-card">
          {metadataExplanation ? (
            <>
              <h2>Resumen automático de la alerta</h2>

              <p style={{ whiteSpace: "pre-line", fontSize: 14 }}>
                {metadataExplanation}
              </p>

              <div className="alert-info-grid" style={{ marginTop: 12 }}>
                <div>
                  <label>Nivel detectado</label>
                  <p>
                    {alert.severity === "critical"
                      ? "Crítica"
                      : alert.severity === "warning"
                      ? "Advertencia"
                      : "Información"}
                  </p>
                </div>

                <div>
                  <label>Avance físico</label>
                  <p>{physical !== null ? `${physical}%` : "No disponible"}</p>
                </div>

                <div>
                  <label>Avance financiero</label>
                  <p>
                    {financial !== null ? `${financial}%` : "No disponible"}
                  </p>
                </div>
              </div>
            </>
          ) : null}
        </div>
      )}

      {/* ACCIONES */}
      <div className="alert-detail-card">
        <h2>Acciones</h2>

        <div className="alert-actions">
          {relatedLink && (
            <button
              className="btn-outline-danger"
              onClick={() => router.push(relatedLink)}
            >
              Ver elemento relacionado
            </button>
          )}

          {user?.role === "admin" && alert.status === "active" && (
            <button
              className="btn-danger"
              disabled={resolving}
              onClick={handleResolve}
            >
              {resolving ? "Resolviendo..." : "Resolver Alerta"}
            </button>
          )}

          {alert.status === "resolved" && (
            <div className="alert-resolved-notice">
              Esta alerta ya ha sido resuelta
            </div>
          )}
        </div>
      </div>

      {/* TOAST */}
      {toast && (
        <div className={`alert-toast ${toast.type}`}>{toast.message}</div>
      )}
    </div>
  );
}
