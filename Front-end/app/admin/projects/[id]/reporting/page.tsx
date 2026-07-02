"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { getProject, type Project } from "@/src/lib/api/projects";
import {
  downloadProjectReport,
  downloadAlertsReport,
  downloadFinancialReport,
} from "@/src/lib/api/reporting";

import "@/styles/project-reporting.css";

export default function ProjectReportingPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = Number(params.id);

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [error, setError] = useState("");

  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  const safe = (v: any): number => {
    const n = Number(v);
    return isNaN(n) ? 0 : n;
  };

  useEffect(() => {
    loadProject();
  }, [projectId]);

  async function loadProject() {
    try {
      setLoading(true);
      const data = await getProject(projectId);
      setProject(data);
    } catch (err: any) {
      setError(err.message || "Error al cargar el proyecto");
    } finally {
      setLoading(false);
    }
  }

  function showToast(message: string, type: "success" | "error") {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }

  async function handleDownload(type: "complete" | "alerts" | "financial") {
    try {
      setDownloading(type);

      if (type === "complete") await downloadProjectReport(projectId);
      if (type === "alerts") await downloadAlertsReport(projectId);
      if (type === "financial") await downloadFinancialReport(projectId);

      showToast("Reporte generado correctamente", "success");
    } catch (err: any) {
      showToast(err.message || "Error al generar reporte", "error");
    } finally {
      setDownloading(null);
    }
  }

  if (loading) {
    return (
      <div className="report-wrapper">
        <div className="loading-text">Cargando proyecto...</div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="report-wrapper">
        <div className="error-text">{error || "Proyecto no encontrado"}</div>
      </div>
    );
  }

  return (
    <div className="report-wrapper">
      {/* HEADER */}
      <div className="report-header">
        <h1 className="report-title">Reportes — {project.name}</h1>

        <button
          className="btn-secondary"
          onClick={() => router.push(`/admin/projects/${projectId}`)}
        >
          Volver al Proyecto
        </button>
      </div>

      {/* CARD: INFO DEL PROYECTO */}
      <div className="report-card">
        <h2 className="report-card-title">Información del Proyecto</h2>

        <div className="info-grid">
          <div>
            <div className="info-label">Código</div>
            <div className="info-value">{project.code}</div>
          </div>

          <div>
            <div className="info-label">Ubicación</div>
            <div className="info-value">{project.location}</div>
          </div>

          <div>
            <div className="info-label">Progreso</div>
            <div className="info-value">{safe(project.progress)}%</div>
          </div>

          <div>
            <div className="info-label">Estado</div>
            <span className={`status-badge ${project.status.toLowerCase()}`}>
              {project.status}
            </span>
          </div>
        </div>
      </div>

      {/* CARD: DESCARGA REPORTES */}
      <div className="report-card">
        <h2 className="report-card-title">Descargar Reportes PDF</h2>

        <div className="download-grid">
          <button
            className="report-button primary"
            onClick={() => handleDownload("complete")}
            disabled={downloading === "complete"}
          >
            {downloading === "complete" ? "Generando..." : "Reporte Completo"}
          </button>

          <button
            className="report-button red"
            onClick={() => handleDownload("alerts")}
            disabled={downloading === "alerts"}
          >
            {downloading === "alerts" ? "Generando..." : "Reporte de Alertas"}
          </button>

          <button
            className="report-button orange"
            onClick={() => handleDownload("financial")}
            disabled={downloading === "financial"}
          >
            {downloading === "financial"
              ? "Generando..."
              : "Reporte Financiero"}
          </button>
        </div>
      </div>

      {/* TOAST */}
      {toast && (
        <div className={`report-toast ${toast.type}`}>{toast.message}</div>
      )}
    </div>
  );
}
