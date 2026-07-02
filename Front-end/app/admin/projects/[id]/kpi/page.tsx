"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";

// 👇 IMPORTS CORRECTOS
import { getProject, type Project } from "@/src/lib/api/projects";
import { getProjectKPI, type ProjectKPI } from "@/src/lib/api/dashboard";

import "@/styles/project-kpi.css";

export default function ProjectKPIPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = Number(params.id);

  const [project, setProject] = useState<Project | null>(null);
  const [kpi, setKPI] = useState<ProjectKPI | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const safeNum = (v: any): number => {
    const n = Number(v);
    return isNaN(n) ? 0 : n;
  };

  // --- Normalizadores de objetos KPI ---

  const getFinancialDrift = () => {
    if (!kpi?.financial_drift) return 0;
    return safeNum(kpi.financial_drift.value);
  };

  const getMismatch = () => {
    if (!kpi?.physical_financial_mismatch) return 0;
    return safeNum(kpi.physical_financial_mismatch.physical ?? 0);
  };

  const getStockBalance = () => {
    if (!kpi?.stock_balance) return 0;
    return safeNum(kpi.stock_balance.value);
  };

  const getTimeDeviation = () => {
    if (!kpi?.time_deviation) return 0;
    return safeNum(kpi.time_deviation.value);
  };

  const getPredictedDelay = () => safeNum(kpi?.predicted_delay);

  const getPredictedOvercost = () => safeNum(kpi?.predicted_overcost);

  useEffect(() => {
    loadData();
  }, [projectId]);

  async function loadData() {
    try {
      setLoading(true);
      const [p, k] = await Promise.all([
        getProject(projectId),
        getProjectKPI(projectId),
      ]);
      setProject(p);
      setKPI(k);
    } catch (err: any) {
      setError(err.message || "Error al cargar KPI");
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div className="kpi-loading">Cargando KPI…</div>;

  if (!project || !kpi)
    return <div className="kpi-error">{error || "No se pudo cargar KPI"}</div>;

  const healthClass = (score: number) => {
    if (score >= 90) return "excellent";
    if (score >= 70) return "good";
    if (score >= 50) return "warning";
    return "critical";
  };

  return (
    <div className="kpi-wrapper">
      {/* HEADER */}
      <div className="kpi-header">
        <div>
          <h1 className="kpi-title">{project.name}</h1>
          <p className="kpi-subtitle">Código: {project.code}</p>
        </div>

        <button className="btn-secondary" onClick={() => router.back()}>
          Volver
        </button>
      </div>

      {/* KPIs PRINCIPALES */}
      <section className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-label">Progreso Físico</div>
          <div className="kpi-value">
            {safeNum(kpi.physical_progress).toFixed(1)}%
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-label">Progreso Financiero</div>
          <div className="kpi-value">
            {safeNum(kpi.financial_progress).toFixed(1)}%
          </div>
        </div>

        <div className="kpi-card warning">
          <div className="kpi-label">Retraso</div>
          <div className="kpi-value">{safeNum(kpi.delay_days)} días</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-label">Balance Material</div>
          <div className="kpi-value">
            {safeNum(kpi.material_balance).toFixed(1)}
          </div>
        </div>
      </section>

      {/* HEALTH SCORE */}
      <section className="kpi-section">
        <h2 className="section-title">Health Score</h2>

        <div className="health-wrapper">
          <div className={`health-circle ${healthClass(kpi.health_score)}`}>
            {safeNum(kpi.health_score).toFixed(0)}
          </div>
          <p className="health-label">Puntuación general del proyecto</p>
        </div>
      </section>

      {/* RIESGO Y ALERTAS */}
      <section className="kpi-section">
        <h2 className="section-title">Riesgo y Alertas</h2>

        <div className="metric-grid">
          <div className="metric-item">
            <span className="metric-label">Nivel de Riesgo</span>
            <span className={`risk-badge ${kpi.risk_level.toLowerCase()}`}>
              {kpi.risk_level}
            </span>
          </div>

          <div className="metric-item">
            <span className="metric-label">Score de Riesgo</span>
            <span className="metric-value">
              {safeNum(kpi.risk_score).toFixed(1)}
            </span>
          </div>
        </div>

        <div className="alerts-grid">
          <div className="alert-item">
            <div className="alert-circle critical">
              {safeNum(kpi.alerts.critical)}
            </div>
            <span>Críticas</span>
          </div>

          <div className="alert-item">
            <div className="alert-circle warning">
              {safeNum(kpi.alerts.warning)}
            </div>
            <span>Advertencias</span>
          </div>

          <div className="alert-item">
            <div className="alert-circle info">{safeNum(kpi.alerts.info)}</div>
            <span>Información</span>
          </div>
        </div>
      </section>

      {/* DESVIACIONES */}
      <section className="kpi-section">
        <h2 className="section-title">Desviaciones y Balances</h2>

        <div className="deviation-list">
          {/* Financial Drift */}
          <div className="deviation-item">
            <span className="deviation-label">Financial Drift</span>
            <div className="deviation-track">
              <div
                className="deviation-fill"
                style={{
                  width: `${Math.min(getFinancialDrift(), 100)}%`,
                }}
              >
                <span className="deviation-text">
                  {getFinancialDrift().toFixed(1)}%
                </span>
              </div>
            </div>
          </div>

          {/* Physical / Financial Gap */}
          <div className="deviation-item">
            <span className="deviation-label">Physical / Financial Gap</span>
            <div className="deviation-track">
              <div
                className="deviation-fill"
                style={{
                  width: `${Math.min(getMismatch(), 100)}%`,
                }}
              >
                <span className="deviation-text">
                  {getMismatch().toFixed(1)}%
                </span>
              </div>
            </div>
          </div>

          {/* Stock Balance */}
          <div className="deviation-item">
            <span className="deviation-label">Stock Balance</span>
            <div className="deviation-track">
              <div
                className="deviation-fill"
                style={{
                  width: `${Math.min(getStockBalance(), 100)}%`,
                }}
              >
                <span className="deviation-text">
                  {getStockBalance().toFixed(1)}
                </span>
              </div>
            </div>
          </div>

          {/* Time Deviation */}
          <div className="deviation-item">
            <span className="deviation-label">Time Deviation</span>
            <div className="deviation-track">
              <div
                className="deviation-fill"
                style={{
                  width: `${Math.min(getTimeDeviation(), 100)}%`,
                }}
              >
                <span className="deviation-text">
                  {getTimeDeviation().toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PREDICCIONES */}
      <section className="kpi-section">
        <h2 className="section-title">Predicciones</h2>

        <div className="metric-grid">
          <div className="metric-item">
            <span className="metric-label">Retraso Predicho</span>
            <span className="metric-value">{getPredictedDelay()} días</span>
          </div>

          <div className="metric-item">
            <span className="metric-label">Sobrecosto Predicho</span>
            <span className="metric-value">
              {getPredictedOvercost().toFixed(1)}%
            </span>
          </div>
        </div>
      </section>

      {/* INTEGRIDAD */}
      <section className="kpi-section">
        <h2 className="section-title">Integridad del Proyecto</h2>

        <div className="metric-grid">
          <div className="metric-item">
            <span className="metric-label">Integridad</span>
            <span className={`risk-badge ${kpi.integrity.toLowerCase()}`}>
              {kpi.integrity}
            </span>
          </div>

          <div className="metric-item">
            <span className="metric-label">Consistencia</span>
            <span className={`risk-badge ${kpi.consistency.toLowerCase()}`}>
              {kpi.consistency}
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}
