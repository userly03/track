"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";

import {
  getProject,
  getProjectKPI,
  type Project,
} from "@/src/lib/api/projects";

import type { ProjectKPI } from "@/src/lib/api/dashboard";

// Nuevo CSS
import "@/styles/supervisor-kpi-v2.css";

export default function SupervisorProjectKPIPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = Number(params.id);

  const [project, setProject] = useState<Project | null>(null);
  const [kpi, setKPI] = useState<ProjectKPI | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /* ===================================================
     LOAD DATA
  =================================================== */
  useEffect(() => {
    loadData();
  }, [projectId]);

  async function loadData() {
    try {
      const [proj, kpiData] = await Promise.all([
        getProject(projectId),
        getProjectKPI(projectId),
      ]);
      setProject(proj);
      setKPI(kpiData);
    } catch (err: any) {
      setError(err.message || "Error al cargar KPI del proyecto.");
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div className="spk-loading">Cargando KPI...</div>;
  if (error || !project || !kpi)
    return <div className="spk-error">Error: {error}</div>;

  /* ===================================================
     UTILS
  =================================================== */
  const safe = (v: any) => (typeof v === "number" ? v : Number(v || 0));

  function describeDeviation(value: number) {
    const a = Math.abs(value);
    if (a <= 20) return "Sin riesgo";
    if (a <= 50) return "Nivel moderado";
    if (a <= 80) return "Riesgo alto";
    return "Riesgo crítico";
  }

  const drift = safe(kpi.financial_drift?.value);
  const pfMismatch =
    typeof kpi.physical_financial_mismatch === "object"
      ? safe(kpi.physical_financial_mismatch.financial) -
        safe(kpi.physical_financial_mismatch.physical)
      : 0;

  const stock = safe(kpi.stock_balance?.value);
  const timeDev = safe(kpi.time_deviation?.value);

  // Traducción de niveles de riesgo y predicciones
  const normalizeLevel = (raw: string | null | undefined): string =>
    (raw || "low").toLowerCase();

  const riskLevel = normalizeLevel(kpi.risk_level);
  const predictedDelayLevel = normalizeLevel(kpi.predicted_delay);
  const predictedOvercostLevel = normalizeLevel(kpi.predicted_overcost);

  const levelToLabel = (level: string) => {
    switch (level) {
      case "low":
        return "Bajo";
      case "medium":
        return "Moderado";
      case "high":
        return "Alto";
      case "critical":
        return "Crítico";
      default:
        return level;
    }
  };

  /* ===================================================
     HEALTH SCORE STYLE
  =================================================== */
  const healthClass =
    kpi.health_score >= 85
      ? "excellent"
      : kpi.health_score >= 65
      ? "good"
      : kpi.health_score >= 45
      ? "warning"
      : "critical";

  /* ===================================================
     UI
  =================================================== */

  return (
    <div className="spk-page">
      {/* HEADER */}
      <div className="spk-header">
        <div>
          <h1 className="spk-title">{project.name}</h1>
          <p className="spk-subtitle">Código: {project.code}</p>
        </div>

        <button className="spk-btn-secondary" onClick={() => router.back()}>
          ← Volver
        </button>
      </div>

      {/* MAIN CARDS */}
      <div className="spk-cards-grid">
        <div className="spk-card">
          <span className="spk-label">Avance Físico</span>
          <span className="spk-value">
            {safe(kpi.physical_progress).toFixed(1)}%
          </span>
          <p className="spk-help">Porcentaje real de construcción ejecutada.</p>
        </div>

        <div className="spk-card">
          <span className="spk-label">Avance Financiero</span>
          <span className="spk-value">
            {safe(kpi.financial_progress).toFixed(1)}%
          </span>
          <p className="spk-help">Monto ejecutado respecto al presupuesto.</p>
        </div>

        <div className="spk-card spk-warning">
          <span className="spk-label">Retraso</span>
          <span className="spk-value">{kpi.delay_days} días</span>
          <p className="spk-help">
            Diferencia respecto al cronograma original.
          </p>
        </div>

        <div className="spk-card">
          <span className="spk-label">Balance Material</span>
          <span className="spk-value">
            {safe(kpi.material_balance).toFixed(1)}
          </span>
          <p className="spk-help">Diferencias entre consumo real y esperado.</p>
        </div>
      </div>

      {/* RISK */}
      <div className="spk-section">
        <h2 className="spk-section-title">Riesgos y Alertas</h2>

        <div className="spk-risk-card">
          <div className="spk-risk-grid">
            <div className="spk-risk-item">
              <span className="spk-risk-label">Nivel de Riesgo</span>
              <span className={`spk-risk-badge ${riskLevel}`}>
                {levelToLabel(riskLevel)}
              </span>
            </div>

            <div className="spk-risk-item">
              <span className="spk-risk-label">Score</span>
              <span className="spk-risk-value">
                {kpi.risk_score.toFixed(1)}
              </span>
            </div>
          </div>

          <div className="spk-alerts-row">
            <div className="spk-alert-box critical">
              {kpi.alerts.critical}
              <span>Críticas</span>
            </div>
            <div className="spk-alert-box warning">
              {kpi.alerts.warning}
              <span>Advertencias</span>
            </div>
            <div className="spk-alert-box info">
              {kpi.alerts.info}
              <span>Info</span>
            </div>
          </div>
        </div>
      </div>

      {/* DEVIATIONS */}
      <div className="spk-section">
        <h2 className="spk-section-title">Desviaciones</h2>

        <div className="spk-deviation-grid">
          {/* Financiera */}
          <div className="spk-deviation-item">
            <span className="spk-dev-label">Desviación Financiera</span>
            <div className="spk-dev-bar-track">
              <div
                className="spk-dev-bar-fill"
                style={{
                  width: `${Math.min(Math.abs(drift), 100)}%`,
                  background: drift > 0 ? "#dc2626" : "#059669",
                }}
              />
            </div>
            <span className="spk-dev-value">{drift.toFixed(1)}%</span>
            <span className="spk-dev-interpret">
              {describeDeviation(drift)}
            </span>
          </div>

          {/* Physical-Financial Gap */}
          <div className="spk-deviation-item">
            <span className="spk-dev-label">Desfase Físico–Financiero</span>
            <div className="spk-dev-bar-track">
              <div
                className="spk-dev-bar-fill"
                style={{
                  width: `${Math.min(Math.abs(pfMismatch), 100)}%`,
                  background: pfMismatch > 0 ? "#d97706" : "#2563eb",
                }}
              />
            </div>
            <span className="spk-dev-value">{pfMismatch.toFixed(1)}%</span>
            <span className="spk-dev-interpret">
              {describeDeviation(pfMismatch)}
            </span>
          </div>

          {/* Stock */}
          <div className="spk-deviation-item">
            <span className="spk-dev-label">Balance de Materiales</span>
            <div className="spk-dev-bar-track">
              <div
                className="spk-dev-bar-fill"
                style={{
                  width: `${Math.min(Math.abs(stock), 100)}%`,
                  background: stock > 0 ? "#059669" : "#dc2626",
                }}
              />
            </div>
            <span className="spk-dev-value">{stock.toFixed(1)}</span>
            <span className="spk-dev-interpret">
              {describeDeviation(stock)}
            </span>
          </div>

          {/* Time deviation */}
          <div className="spk-deviation-item">
            <span className="spk-dev-label">Desviación del Cronograma</span>
            <div className="spk-dev-bar-track">
              <div
                className="spk-dev-bar-fill"
                style={{
                  width: `${Math.min(Math.abs(timeDev), 100)}%`,
                  background: timeDev > 0 ? "#dc2626" : "#059669",
                }}
              />
            </div>
            <span className="spk-dev-value">{timeDev.toFixed(1)}%</span>
            <span className="spk-dev-interpret">
              {describeDeviation(timeDev)}
            </span>
          </div>
        </div>
      </div>

      {/* PREDICTIONS */}
      <div className="spk-section">
        <h2 className="spk-section-title">Predicciones</h2>

        <div className="spk-prediction-grid">
          <div className="spk-prediction-item">
            <span className="spk-prediction-label">Retraso Estimado</span>
            <span className={`spk-prediction-value ${predictedDelayLevel}`}>
              {levelToLabel(predictedDelayLevel)}
            </span>
          </div>

          <div className="spk-prediction-item">
            <span className="spk-prediction-label">Sobrecosto Estimado</span>
            <span className={`spk-prediction-value ${predictedOvercostLevel}`}>
              {levelToLabel(predictedOvercostLevel)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
