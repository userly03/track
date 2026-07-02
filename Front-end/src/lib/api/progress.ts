// src/lib/api/progress.ts
import { apiFetch } from "./client";

type ApiResponse<T> = { ok: boolean; data?: T; error?: string };
function ensure<T>(res: ApiResponse<T>, msg: string): T {
  if (!res.ok || res.data === undefined) throw new Error(res.error || msg);
  return res.data;
}

/* ===============================
   PROGRESS REPORT MODEL
================================ */

export interface ProgressReport {
  id: number;
  projectId: number;      // backend field
  project: number;        // alias used in forms
  description: string;
  percentage: number;
  date: string;
  status: "pending" | "approved" | "observed";
  metadata: Record<string, any>;
  content_hash: string;
  previous_hash: string;
  created_at: string;
  updated_at: string;
}

export interface CreateProgressData {
  project: number;
  description: string;
  percentage: number;
  date: string;
  status: "pending" | "approved" | "observed";
  metadata?: Record<string, any>;
}

export interface UpdateProgressData extends Partial<CreateProgressData> {}

/* ===============================
        API CALLS — FIXED /api/progress/
================================ */

export async function getProgressReports(projectId?: number): Promise<ProgressReport[]> {
  const url = projectId
    ? `/api/progress/?projectId=${projectId}`
    : `/api/progress/`;

  return ensure(
    await apiFetch<ProgressReport[]>(url),
    "Error al obtener reportes de progreso"
  );
}

export async function getProgressReport(id: number): Promise<ProgressReport> {
  return ensure(
    await apiFetch<ProgressReport>(`/api/progress/${id}/`),
    "Error al obtener reporte de progreso"
  );
}

export async function createProgress(data: CreateProgressData): Promise<ProgressReport> {
  return ensure(
    await apiFetch<ProgressReport>("/api/progress/", {
      method: "POST",
      body: JSON.stringify(data),
    }),
    "Error al crear reporte de progreso"
  );
}

export async function updateProgress(id: number, data: UpdateProgressData): Promise<ProgressReport> {
  return ensure(
    await apiFetch<ProgressReport>(`/api/progress/${id}/`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
    "Error al actualizar reporte de progreso"
  );
}
