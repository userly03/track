"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getProject, type Project } from "@/src/lib/api/projects";
import {
  downloadProjectReport,
  downloadAlertsReport,
  downloadFinancialReport,
} from "@/src/lib/api/reporting";

import "@/styles/supervisor-reporting.css";

export default function SupervisorProjectReportingPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = Number(params.id);

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [toast, setToast] = useState<{ message: string; type: string } | null>(
    null
  );

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

      if (type === "complete") {
        await downloadProjectReport(projectId);
        showToast("Reporte completo generado correctamente ✔", "success");
      } else if (type === "alerts") {
        await downloadAlertsReport(projectId);
        showToast("Reporte de alertas generado correctamente ✔", "success");
      } else if (type === "financial") {
        await downloadFinancialReport(projectId);
        showToast("Reporte financiero generado correctamente ✔", "success");
      }
    } catch (err: any) {
      showToast(err.message || "Error al generar el reporte ❌", "error");
    } finally {
      setDownloading(null);
    }
  }

  if (loading)
    return (
      <div className="reporting-container">
        <div className="loading">Cargando proyecto...</div>
      </div>
    );

  if (error || !project)
    return (
      <div className="reporting-container">
        <div className="error-box">
          Error: {error || "Proyecto no encontrado"}
        </div>
      </div>
    );

  return (
    <div className="reporting-container">
      {/* HEADER */}
      <div className="reporting-header">
        <div>
          <h1 className="reporting-title">Reportes del Proyecto</h1>
          <p className="reporting-subtitle">{project.name}</p>
        </div>

        <button
          className="btn-secondary"
          onClick={() => router.push(`/supervisor/projects/${projectId}`)}
        >
          ← Volver al Proyecto
        </button>
      </div>

      {/* PROJECT INFO CARD */}
      <div className="reporting-card">
        <h2 className="card-title">Información General</h2>

        <div className="info-grid">
          <div className="info-item">
            <span className="info-label">Código</span>
            <span className="info-value">{project.code}</span>
          </div>

          <div className="info-item">
            <span className="info-label">Ubicación</span>
            <span className="info-value">{project.location}</span>
          </div>

          <div className="info-item">
            <span className="info-label">Estado</span>
            <span className={`status-badge ${project.status.toLowerCase()}`}>
              {project.status}
            </span>
          </div>

          <div className="info-item">
            <span className="info-label">Progreso</span>
            <span className="info-value">{project.progress}%</span>
          </div>
        </div>
      </div>

      {/* REPORTS DOWNLOAD CARD */}
      <div className="reporting-card">
        <h2 className="card-title">Descargar Reportes en PDF</h2>

        <div className="report-buttons">
          {/* COMPLETE */}
          <button
            className="report-btn complete"
            onClick={() => handleDownload("complete")}
            disabled={downloading === "complete"}
          >
            <span className="icon">📄</span>
            {downloading === "complete" ? "Generando..." : "Reporte Completo"}
          </button>

          {/* ALERTS */}
          <button
            className="report-btn alerts"
            onClick={() => handleDownload("alerts")}
            disabled={downloading === "alerts"}
          >
            <span className="icon">⚠️</span>
            {downloading === "alerts" ? "Generando..." : "Reporte de Alertas"}
          </button>

          {/* FINANCIAL */}
          <button
            className="report-btn financial"
            onClick={() => handleDownload("financial")}
            disabled={downloading === "financial"}
          >
            <span className="icon">💰</span>
            {downloading === "financial"
              ? "Generando..."
              : "Reporte Financiero"}
          </button>
        </div>
      </div>

      {/* TOAST */}
      {toast && <div className={`toast ${toast.type}`}>{toast.message}</div>}
    </div>
  );
}
