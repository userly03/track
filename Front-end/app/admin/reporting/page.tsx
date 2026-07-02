"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { getProjects, type Project } from "@/src/lib/api/projects";
import {
  downloadProjectReport,
  downloadAlertsReport,
  downloadFinancialReport,
} from "@/src/lib/api/reporting";

import "@/styles/reporting-admin.css"; // ⬅️ Nuevo CSS unificado del módulo

export default function ReportingPage() {
  const router = useRouter();

  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(
    null
  );

  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [error, setError] = useState("");

  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  useEffect(() => {
    loadProjects();
  }, []);

  async function loadProjects() {
    try {
      setLoading(true);
      const data = await getProjects();
      setProjects(data);
      if (data.length > 0) setSelectedProjectId(data[0].id);
    } catch (err: any) {
      setError(err.message || "Error al cargar proyectos");
    } finally {
      setLoading(false);
    }
  }

  function showToast(message: string, type: "success" | "error") {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }

  async function handleDownload(type: "complete" | "alerts" | "financial") {
    if (!selectedProjectId) {
      showToast("Selecciona un proyecto", "error");
      return;
    }

    try {
      setDownloading(type);

      if (type === "complete") await downloadProjectReport(selectedProjectId);
      if (type === "alerts") await downloadAlertsReport(selectedProjectId);
      if (type === "financial")
        await downloadFinancialReport(selectedProjectId);

      showToast("Reporte generado correctamente", "success");
    } catch (err: any) {
      showToast(err.message || "Error al generar el reporte", "error");
    } finally {
      setDownloading(null);
    }
  }

  if (loading) {
    return (
      <div className="reporting-container">
        <div className="reporting-loading">Cargando proyectos...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="reporting-container">
        <div className="reporting-error">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="reporting-container">
      {/* === HEADER === */}
      <div className="reporting-header">
        <div>
          <h1 className="reporting-title">Generación de Reportes PDF</h1>
          <p className="reporting-subtitle">
            Descarga reportes completos, de alertas o financieros.
          </p>
        </div>

        <button className="btn-secondary" onClick={() => router.back()}>
          ← Volver
        </button>
      </div>

      {/* === SELECTOR === */}
      <div className="reporting-card">
        <h2 className="reporting-card-title">Seleccionar Proyecto</h2>

        <div className="reporting-card-body">
          <label className="reporting-label">Proyecto</label>

          <select
            className="reporting-select"
            value={selectedProjectId || ""}
            onChange={(e) => setSelectedProjectId(Number(e.target.value))}
          >
            {(Array.isArray(projects) ? projects : []).map((project) => (
              <option key={project.id} value={project.id}>
                [{project.code}] {project.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* === BOTONES DE DESCARGA === */}
      <div className="reporting-card">
        <h2 className="reporting-card-title">Reportes del Proyecto</h2>

        <div className="reporting-buttons-grid">
          <button
            className="reporting-button primary"
            onClick={() => handleDownload("complete")}
            disabled={downloading === "complete"}
          >
            📄{" "}
            {downloading === "complete"
              ? "Generando..."
              : "Reporte Completo PDF"}
          </button>

          <button
            className="reporting-button warning"
            onClick={() => handleDownload("alerts")}
            disabled={downloading === "alerts"}
          >
            🚨{" "}
            {downloading === "alerts"
              ? "Generando..."
              : "Reporte de Alertas PDF"}
          </button>

          <button
            className="reporting-button success"
            onClick={() => handleDownload("financial")}
            disabled={downloading === "financial"}
          >
            💰{" "}
            {downloading === "financial"
              ? "Generando..."
              : "Reporte Financiero PDF"}
          </button>
        </div>
      </div>

      {/* === TOAST === */}
      {toast && (
        <div className={`reporting-toast ${toast.type}`}>{toast.message}</div>
      )}
    </div>
  );
}
