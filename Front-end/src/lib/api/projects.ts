// src/lib/api/projects.ts
import { apiFetch } from "./client";
import type { ProjectKPI, DashboardKPI } from "./dashboard";

/* ============================
   PROJECT MODEL (BACKEND SYNC)
============================ */

export interface Project {
  id: number;
  code: string;
  name: string;
  location: string;
  start_date: string;
  end_date_estimated: string;
  progress: number;
  status: string;

  metadata: Record<string, any> | null;

  created_by: number | null;
  updated_by: number | null;

  content_hash: string;
  previous_hash: string;
  created_at: string;
  updated_at: string;
}

/* ============================
   HELPERS
============================ */

type ApiResponse<T> = {
  ok: boolean;
  data?: T;
  error?: string;
};

function ensureData<T>(res: ApiResponse<T>, defaultMessage: string): T {
  if (!res.ok || res.data === undefined) {
    throw new Error(res.error || defaultMessage);
  }
  return res.data;
}

/* ============================
   CRUD — SOLO FIX DE RUTAS
============================ */

export async function getProjects(): Promise<Project[]> {
  const res = await apiFetch<Project[] | { results: Project[] }>("/api/projects/");
  const data = res.data;

  if (Array.isArray(data)) return data;
  if (data && Array.isArray((data as any).results)) {
    return (data as any).results;
  }
  return [];
}

export async function getProject(id: number): Promise<Project> {
  const res = await apiFetch<Project>(`/api/projects/${id}/`);
  return ensureData(res, "Error al obtener proyecto");
}

export async function createProject(data: any): Promise<Project> {
  const res = await apiFetch<Project>("/api/projects/", {
    method: "POST",
    body: JSON.stringify(data),
  });
  return ensureData(res, "Error al crear proyecto");
}

export async function updateProject(
  id: number,
  data: any
): Promise<Project> {
  const res = await apiFetch<Project>(`/api/projects/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
  return ensureData(res, "Error al actualizar proyecto");
}

/* ============================
   KPI INDIVIDUAL — SOLO FIX DE RUTA
============================ */

export async function getProjectKPI(id: number): Promise<ProjectKPI> {
  const res = await apiFetch<ProjectKPI>(`/api/projects/${id}/kpi/`);
  return ensureData(res, "Error al obtener KPI del proyecto");
}

/* ============================
   DASHBOARD GLOBAL — SOLO FIX DE RUTA
============================ */

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
      projects: []
    };
  }

  return res.data;
}
