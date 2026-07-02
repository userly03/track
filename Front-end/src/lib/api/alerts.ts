// src/lib/api/alerts.ts
import { apiFetch } from "./client"

/* ============================
   MODEL
============================ */

export interface Alert {
  id: number
  projectId: number
  item_type: string
  item_id: number
  title: string
  message: string
  severity: "critical" | "warning" | "info"
  status: "active" | "resolved"
  created_at: string
  resolved_at: string | null
  metadata: Record<string, any>
}

export interface AlertFilters {
  severity?: string
  status?: string
  item_type?: string
  project?: string
}

/* ============================
   HELPER
============================ */

type ApiResponse<T> = {
  ok: boolean
  data?: T
  error?: string
}

function ensureData<T>(res: ApiResponse<T>, msg: string): T {
  if (!res.ok || res.data === undefined) {
    throw new Error(res.error || msg)
  }
  return res.data
}

/* ============================
   LIST ALERTS — FIXED
============================ */

export async function getAlerts(filters?: AlertFilters): Promise<Alert[]> {
  const params = new URLSearchParams()

  if (filters?.severity && filters.severity !== "all")
    params.append("severity", filters.severity)

  if (filters?.status && filters.status !== "all")
    params.append("status", filters.status)

  if (filters?.item_type && filters.item_type !== "all")
    params.append("item_type", filters.item_type)

  if (filters?.project && filters.project !== "all")
    params.append("project", filters.project)

  const url = `/api/alerts/${params.toString() ? `?${params.toString()}` : ""}`

  const res = await apiFetch<Alert[] | { results: Alert[] }>(url)

  const data = res.data

  if (Array.isArray(data)) return data

  if (data && Array.isArray((data as any).results))
    return (data as any).results

  return []
}

/* ============================
   GET SINGLE ALERT — FIXED
============================ */

export async function getAlert(id: number): Promise<Alert> {
  const res = await apiFetch<Alert>(`/api/alerts/${id}/`)
  return ensureData(res, "Error al obtener alerta")
}

/* ============================
   RESOLVE ALERT — FIXED
============================ */

export async function resolveAlert(id: number): Promise<Alert> {
  const res = await apiFetch<Alert>(`/api/alerts/${id}/resolve/`, {
    method: "PATCH",
    body: JSON.stringify({ status: "resolved" }),
  })

  return ensureData(res, "Error al resolver alerta")
}
