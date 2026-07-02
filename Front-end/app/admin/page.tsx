"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import {
  getDashboardKPI,
  type DashboardKPI,
  type ProjectKPI,
} from "@/src/lib/api/dashboard";

// ✅ IMPORTAR SISTEMA DE AUTENTICACIÓN QUE SÍ FUNCIONA
import { useAuth } from "@/src/lib/auth/use-auth";

import "@/styles/dashboard.css";
import "@/styles/table.css";
import "@/styles/kpi.css";

export default function AdminDashboard() {
  const router = useRouter();

  // ✅ OBTENER USUARIO ACTUAL (FUNCIONA CON LOGIN REAL)
  const { user } = useAuth();

  const [dashboard, setDashboard] = useState<DashboardKPI | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [riskFilter, setRiskFilter] = useState("all");
  const [onlyDelayed, setOnlyDelayed] = useState(false);
  const [onlyLowHealth, setOnlyLowHealth] = useState(false);

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    try {
      setLoading(true);
      const data = await getDashboardKPI();

      const safeDashboard = {
        ...data,
        projects: Array.isArray(data?.projects) ? data.projects : [],
        average_health_score: data?.average_health_score ?? 0,
        average_risk_score: data?.average_risk_score ?? 0,
        total_projects: data?.total_projects ?? 0,
        delayed_projects: data?.delayed_projects ?? 0,
        total_alerts_critical: data?.total_alerts_critical ?? 0,
      };

      setDashboard(safeDashboard);
    } catch (err: any) {
      setError(err.message || "Error al cargar el dashboard");
    } finally {
      setLoading(false);
    }
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/admin/search?q=${encodeURIComponent(query)}`);
    }
  }

  function getFiltered(): ProjectKPI[] {
    if (!dashboard || !dashboard.projects) return [];

    return dashboard.projects.filter((p) => {
      const q = query.toLowerCase();

      if (q && !p.project_name.toLowerCase().includes(q)) return false;
      if (statusFilter !== "all" && p.status !== statusFilter) return false;
      if (riskFilter !== "all" && p.risk_level !== riskFilter) return false;
      if (onlyDelayed && p.delay_days <= 0) return false;
      if (onlyLowHealth && p.health_score >= 50) return false;

      return true;
    });
  }

  if (loading)
    return (
      <div className="dashboard-container">
        <div className="dashboard-loading">Cargando Dashboard...</div>
      </div>
    );

  if (!dashboard)
    return (
      <div className="dashboard-container">
        <div className="dashboard-error">{error || "Error al cargar"}</div>
      </div>
    );

  const filtered = getFiltered();

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Dashboard Ejecutivo</h1>

          {/* ✅ TEXTO DE BIENVENIDA PERSONALIZADO */}
          {user && (
            <p className="dashboard-subtitle" style={{ fontWeight: "600" }}>
              Bienvenido,{" "}
              <span style={{ color: "#2563eb" }}>{user.username}</span> — Rol:{" "}
              <strong>{user.role}</strong>
            </p>
          )}

          <p className="dashboard-subtitle">
            Vista general del estado del sistema
          </p>
        </div>
      </header>

      {/* SEARCH */}
      <form onSubmit={handleSearch} className="global-search-form">
        <input
          type="text"
          placeholder="Buscar en toda la plataforma..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="global-search-input"
        />
        <button type="submit" className="global-search-button">
          Buscar
        </button>
      </form>

      {/* KPIs */}
      <section className="kpi-cards-grid">
        <KpiCard
          label="Total Proyectos"
          value={dashboard.total_projects}
          trend="Activos"
          color="blue"
        />
        <KpiCard
          label="Retrasados"
          value={dashboard.delayed_projects}
          trend="Con retraso"
          color="red"
        />
        <KpiCard
          label="Alertas Críticas"
          value={dashboard.total_alerts_critical}
          trend="Requieren atención"
          color="yellow"
        />
        <KpiCard
          label="Health Promedio"
          value={(dashboard.average_health_score ?? 0).toFixed(1)}
          trend="Salud general"
          color="green"
        />
        <KpiCard
          label="Risk Promedio"
          value={(dashboard.average_risk_score ?? 0).toFixed(1)}
          trend="Nivel de riesgo"
          color="purple"
        />
      </section>

      {/* FILTERS */}
      <section className="dashboard-filters">
        <Select
          label="Estado:"
          value={statusFilter}
          onChange={setStatusFilter}
          options={[
            { value: "all", label: "Todos" },
            { value: "active", label: "Activo" },
            { value: "completed", label: "Completado" },
            { value: "paused", label: "Pausado" },
          ]}
        />

        <Select
          label="Riesgo:"
          value={riskFilter}
          onChange={setRiskFilter}
          options={[
            { value: "all", label: "Todos" },
            { value: "low", label: "Bajo" },
            { value: "medium", label: "Medio" },
            { value: "high", label: "Alto" },
          ]}
        />

        <Checkbox
          label="Solo retrasados"
          checked={onlyDelayed}
          onChange={setOnlyDelayed}
        />

        <Checkbox
          label="Health < 50"
          checked={onlyLowHealth}
          onChange={setOnlyLowHealth}
        />
      </section>

      {/* PROJECT TABLE */}
      <section className="dashboard-section">
        <h2 className="section-title">
          Resumen de Proyectos ({filtered.length})
        </h2>

        <div className="table-wrapper">
          <table className="dashboard-table">
            <thead>
              <tr>
                <th>Código</th>
                <th>Proyecto</th>
                <th>Avance Físico</th>
                <th>Avance Financiero</th>
                <th>Retraso</th>
                <th>Riesgo</th>
                <th>Health</th>
                <th>Alertas</th>
                <th>Integridad</th>
                <th></th>
              </tr>
            </thead>

            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} className="table-empty">
                    No hay resultados según los filtros.
                  </td>
                </tr>
              ) : (
                filtered.map((p) => (
                  <ProjectRow key={p.project_id} project={p} router={router} />
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

/* ==== COMPONENTES ==== */

function KpiCard({ label, value, trend, color }: any) {
  return (
    <div className={`kpi-card ${color}`}>
      <div className="kpi-card-label">{label}</div>
      <div className="kpi-card-value">{value}</div>
      <div className="kpi-card-trend">{trend}</div>
    </div>
  );
}

function Checkbox({ label, checked, onChange }: any) {
  return (
    <label className="filter-checkbox">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span>{label}</span>
    </label>
  );
}

function Select({ label, value, onChange, options }: any) {
  return (
    <div className="filter-group">
      <label className="filter-label">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="filter-select"
      >
        {options.map((op: any) => (
          <option key={op.value} value={op.value}>
            {op.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function ProjectRow({ project, router }: any) {
  return (
    <tr>
      <td>
        <span className="project-code">{project.project_code}</span>
      </td>

      <td>{project.project_name}</td>

      <td>
        <ProgressBar value={project.physical_progress} />
      </td>

      <td>
        <ProgressBar value={project.financial_progress} financial />
      </td>

      <td>
        <span
          className={`delay-badge ${
            project.delay_days > 0 ? "delayed" : "on-time"
          }`}
        >
          {project.delay_days > 0 ? `+${project.delay_days} días` : "A tiempo"}
        </span>
      </td>

      <td>
        <span className={`risk-badge ${project.risk_level}`}>
          {project.risk_level}
        </span>
      </td>

      <td>
        <span
          className={`health-score ${getHealthClass(project.health_score)}`}
        >
          {project.health_score.toFixed(0)}
        </span>
      </td>

      <td>
        <AlertsMini alerts={project.alerts} />
      </td>

      <td>
        <span
          className={`integrity-indicator ${
            project.integrity === "ok" ? "valid" : "invalid"
          }`}
        >
          {project.integrity === "ok" ? "✓" : "✗"}
        </span>
      </td>

      <td>
        <div className="table-actions">
          <button
            className="btn-action primary"
            onClick={() => router.push(`/admin/projects/${project.project_id}`)}
          >
            Ver
          </button>
          <button
            className="btn-action secondary"
            onClick={() => router.push(`/admin/reporting`)}
          >
            PDF
          </button>
        </div>
      </td>
    </tr>
  );
}

function ProgressBar({ value, financial = false }: any) {
  return (
    <div className="progress-container">
      <div className="progress-bar">
        <div
          className={`progress-fill ${financial ? "financial" : ""}`}
          style={{ width: `${value}%` }}
        />
      </div>
      <span className="progress-label">{value.toFixed(1)}%</span>
    </div>
  );
}

function AlertsMini({ alerts }: any) {
  return (
    <div className="alerts-mini">
      {alerts.critical > 0 && (
        <span className="alert-dot critical">{alerts.critical}</span>
      )}
      {alerts.warning > 0 && (
        <span className="alert-dot warning">{alerts.warning}</span>
      )}
      {alerts.info > 0 && <span className="alert-dot info">{alerts.info}</span>}
    </div>
  );
}

function getHealthClass(score: number) {
  if (score >= 80) return "excellent";
  if (score >= 60) return "good";
  if (score >= 40) return "warning";
  return "critical";
}
