// src/lib/api/history.ts
import { apiFetch } from "./client"

type ApiResponse<T> = { ok: boolean; data?: T; error?: string }
function ensure<T>(res: ApiResponse<T>, msg: string): T {
  if (!res.ok || res.data === undefined) throw new Error(res.error || msg)
  return res.data
}

/* ===============================
        MODELOS
================================ */

export interface HistoryRecord {
  id: number
  action_type: string
  user: number
  projectId: number
  related_type: string
  related_id: number
  previous_hash: string | null
  new_hash: string
  previous_data: Record<string, any> | null
  new_data: Record<string, any>
  metadata: Record<string, any>
  created_at: string
}

export interface ChangeRecord {
  id: number
  model_name: string
  objectId: number
  field: string
  old_value: string | null
  new_value: string
  reason: string | null
  changedBy: number
  timestamp: string
  hash_change: string
}

/* ===============================
        API CALLS — /api/ FIX
================================ */

export async function getHistory(limit?: number): Promise<HistoryRecord[]> {
  const url = limit
    ? `/api/history/?limit=${limit}`
    : `/api/history/`

  return ensure(
    await apiFetch<HistoryRecord[]>(url),
    "Error al cargar historial"
  )
}

export async function getHistoryById(id: number): Promise<HistoryRecord> {
  return ensure(
    await apiFetch<HistoryRecord>(`/api/history/${id}/`),
    "Error al cargar historial"
  )
}

export async function getHistoryByProject(projectId: number, limit?: number): Promise<HistoryRecord[]> {
  const url = limit
    ? `/api/history/project/${projectId}/?limit=${limit}`
    : `/api/history/project/${projectId}/`

  return ensure(
    await apiFetch<HistoryRecord[]>(url),
    "Error al cargar historial por proyecto"
  )
}

export async function getHistoryByEntity(type: string, id: number, limit?: number): Promise<HistoryRecord[]> {
  const url = limit
    ? `/api/history/entity/${type}/${id}/?limit=${limit}`
    : `/api/history/entity/${type}/${id}/`

  return ensure(
    await apiFetch<HistoryRecord[]>(url),
    "Error al cargar historial por entidad"
  )
}

export async function getChangeRecords(): Promise<ChangeRecord[]> {
  return ensure(
    await apiFetch<ChangeRecord[]>(`/api/history/changes/`),
    "Error al cargar cambios"
  )
}

export async function getChangeRecordsByEntity(modelName: string, objectId: number): Promise<ChangeRecord[]> {
  return ensure(
    await apiFetch<ChangeRecord[]>(`/api/history/changes/entity/${modelName}/${objectId}/`),
    "Error al cargar cambios por entidad"
  )
}

export async function getChangeRecordsByProject(projectId: number): Promise<ChangeRecord[]> {
  return ensure(
    await apiFetch<ChangeRecord[]>(`/api/history/changes/project/${projectId}/`),
    "Error al cargar cambios por proyecto"
  )
}
