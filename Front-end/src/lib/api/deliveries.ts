// src/lib/api/deliveries.ts
import { apiFetch } from "./client"

export interface Delivery {
  id: number
  projectId: number
  purchaseId: number | null
  description: string
  quantity: number
  unit: string
  date: string
  status: "pending" | "approved" | "observed"
  metadata: Record<string, any> | null
  content_hash: string
  previous_hash: string
  created_at: string
  updated_at: string
}

export interface CreateDeliveryData {
  projectId: number
  purchaseId?: number | null
  description: string
  quantity: number
  unit: string
  date: string
  status: "pending" | "approved" | "observed"
  metadata?: Record<string, any> | null
}

export interface UpdateDeliveryData extends Partial<CreateDeliveryData> {}

type ApiResponse<T> = { ok: boolean; data?: T; error?: string }

function ensure<T>(res: ApiResponse<T>, msg: string): T {
  if (!res.ok || res.data === undefined) throw new Error(res.error || msg)
  return res.data
}

/* ============================
   API CALLS — /api/ FIX
============================ */

export async function getDeliveries(): Promise<Delivery[]> {
  const res = await apiFetch<Delivery[]>("/api/deliveries/")
  return ensure(res, "Error al obtener entregas")
}

export async function getDelivery(id: number): Promise<Delivery> {
  const res = await apiFetch<Delivery>(`/api/deliveries/${id}/`)
  return ensure(res, "Error al obtener entrega")
}

export async function createDelivery(data: CreateDeliveryData): Promise<Delivery> {
  const res = await apiFetch<Delivery>("/api/deliveries/", {
    method: "POST",
    body: JSON.stringify(data),
  })
  return ensure(res, "Error al crear entrega")
}

export async function updateDelivery(id: number, data: UpdateDeliveryData): Promise<Delivery> {
  const res = await apiFetch<Delivery>(`/api/deliveries/${id}/`, {
    method: "PUT",
    body: JSON.stringify(data),
  })
  return ensure(res, "Error al actualizar entrega")
}

export async function deleteDelivery(id: number): Promise<void> {
  const res = await apiFetch<void>(`/api/deliveries/${id}/`, { method: "DELETE" })
  ensure(res, "Error al eliminar entrega")
}
