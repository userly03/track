// src/lib/api/dashboard.ts
import { apiFetch } from "./client";

/* ============================================================
   TYPES
============================================================ */

export interface ProjectKPI {
  project_id: number;
  project_code: string;
  project_name: string;
  status: string;

  physical_progress: number;
  financial_progress: number;
  material_balance: number;
  delay_days: number;

  alerts: {
    critical: number;
    warning: number;
    info: number;
  };

  integrity: string;

  financial_drift: { value: number | null; level: string | null };
  physical_financial_mismatch: { status: string | null; physical?: number | null; financial?: number | null; deliveries_ratio?: number | null };
  stock_balance: { value: number | null; level: string | null };
  time_deviation: { value: number | null; level: string | null };

  predicted_delay: string | null;
  predicted_overcost: string | null;

  risk_score: number;
  risk_level: string;
  health_score: number;

  consistency: string;
}

export interface DashboardKPI {
  total_projects: number;
  delayed_projects: number;

  average_health_score: number;
  average_risk_score: number;

  total_alerts_critical: number;
  total_alerts_warning: number;
  total_alerts_info: number;

  projects: ProjectKPI[];
}

/* ============================================================
   API CALLS — SOLO FIX DE RUTAS
============================================================ */

export async function getDashboardKPI(): Promise<DashboardKPI> {
  const res = await apiFetch<DashboardKPI | null>("/api/projects/dashboard/kpi/");

  if (!res.ok || !res.data) {
    return {
      total_projects: 0,
      delayed_projects: 0,
      average_health_score: 0,
      average_risk_score: 0,
      total_alerts_critical: 0,
      total_alerts_warning: 0,
      total_alerts_info: 0,
      projects: [],
    };
  }

  return res.data;
}

export async function getProjectKPI(projectId: number): Promise<ProjectKPI> {
  const res = await apiFetch<ProjectKPI>(`/api/projects/${projectId}/kpi/`);
  if (!res.ok || !res.data) throw new Error("Error al obtener KPI del proyecto");
  return res.data;
}
