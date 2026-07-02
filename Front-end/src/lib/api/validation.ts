// src/lib/api/validation.ts
import { apiFetch } from "./client"

type ApiResponse<T> = { ok: boolean; data?: T; error?: string }
function ensure<T>(res: ApiResponse<T>, msg: string): T {
  if (!res.ok || res.data === undefined) throw new Error(res.error || msg)
  return res.data
}

/* ============================
        MODELOS
============================ */

export interface ValidationRecord {
  id: number
  validator: string
  validator_role: string
  decision: "approve" | "reject"
  comment: string
  metadata: Record<string, any>
  content_hash: string
  previous_hash: string
  created_at: string
}

export interface ValidationItem {
  id: number
  type: "purchase" | "delivery" | "progress" | "document"
  status:
    | "pending"
    | "under_review"
    | "approved_partial"
    | "approved"
    | "rejected"
    | "auto_closed"
  required_approvals: number
  approvals_count: number
  rejections_count: number
  supervisor_comment: string
  metadata: Record<string, any>
  content_hash: string
  previous_hash: string
  validated_by: string | null
  validated_at: string | null
  related_id: number
  project_id: number

  /* ⭐ NUEVO CAMPO DEL BACKEND */
  related_name: string | null

  records: ValidationRecord[]
  created_at: string
  updated_at: string
}

export interface ApproveData {
  comment?: string
}

export interface RejectData {
  comment: string
}

/* ============================
   API CALLS — /api/ FIX
============================ */

export async function getValidationItems(): Promise<ValidationItem[]> {
  return ensure(
    await apiFetch<ValidationItem[]>("/api/validation/"),
    "Error al obtener elementos de validación"
  )
}

export async function getValidationItem(id: number): Promise<ValidationItem> {
  return ensure(
    await apiFetch<ValidationItem>(`/api/validation/${id}/`),
    "Error al obtener el elemento de validación"
  )
}

export async function approveValidation(
  itemId: number,
  data?: ApproveData
): Promise<ValidationItem> {
  return ensure(
    await apiFetch<ValidationItem>(`/api/validation/${itemId}/approve/`, {
      method: "POST",
      body: JSON.stringify(data || {}),
    }),
    "Error al aprobar validación"
  )
}

export async function rejectValidation(
  itemId: number,
  data: RejectData
): Promise<ValidationItem> {
  return ensure(
    await apiFetch<ValidationItem>(`/api/validation/${itemId}/reject/`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
    "Error al rechazar validación"
  )
}
