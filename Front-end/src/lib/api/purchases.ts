// src/lib/api/purchases.ts

import { apiFetch } from "./client"

/* ============================
   HELPER TYPES
============================ */

type ApiResponse<T> = { ok: boolean; data?: T; error?: string }

function ensure<T>(res: ApiResponse<T>, msg: string): T {
  if (!res.ok || res.data === undefined) throw new Error(res.error || msg)
  return res.data
}

/* ============================
   TYPES
============================ */

export interface MarketPrice {
  query: string
  market_avg: number | null
  market_min: number | null
  market_max: number | null
  sources: string[]
  updated_at: string | null
}

export interface Purchase {
  id: number
  projectId: number

  item_name: string
  quantity: number
  unit_price: number

  supplier: string
  status: "pending" | "approved" | "observed"

  metadata: Record<string, any>

  market_price: MarketPrice | null

  total_price: number
  content_hash: string
  previous_hash: string

  created_at: string
  updated_at: string

  validation_id: number | null
}

/* ============================
   CREATE / UPDATE
============================ */

export interface CreatePurchaseData {
  projectId: number
  item_name: string
  quantity: number
  unit_price: number
  supplier: string
  status: "pending" | "approved" | "observed"
  metadata?: Record<string, any>
}

export interface UpdatePurchaseData extends Partial<CreatePurchaseData> {}

/* ============================
   API CALLS — RUTAS FIX /api/
============================ */

export async function getPurchases(): Promise<Purchase[]> {
  return ensure(
    await apiFetch<Purchase[]>("/api/purchases/"),
    "Error al obtener compras"
  )
}

export async function getPurchase(id: number): Promise<Purchase> {
  return ensure(
    await apiFetch<Purchase>(`/api/purchases/${id}/`),
    "Error al obtener compra"
  )
}

export async function createPurchase(data: CreatePurchaseData): Promise<Purchase> {
  return ensure(
    await apiFetch<Purchase>("/api/purchases/", {
      method: "POST",
      body: JSON.stringify(data),
    }),
    "Error al crear compra"
  )
}

export async function updatePurchase(id: number, data: UpdatePurchaseData): Promise<Purchase> {
  return ensure(
    await apiFetch<Purchase>(`/api/purchases/${id}/`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
    "Error al actualizar compra"
  )
}

export async function updatePurchaseStatus(
  id: number,
  status: Purchase["status"]
): Promise<Purchase> {
  return ensure(
    await apiFetch<Purchase>(`/api/purchases/${id}/`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),
    "Error al actualizar estado de compra"
  )
}
