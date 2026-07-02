// src/lib/api/market.ts
import { apiFetch } from "./client"

type ApiResponse<T> = { ok: boolean; data?: T; error?: string }
function ensure<T>(res: ApiResponse<T>, msg: string): T {
  if (!res.ok || res.data === undefined) throw new Error(res.error || msg)
  return res.data
}

/* ============================
   REAL MARKET PRICE (PRO)
============================ */

export interface MarketPrice {
  query: string
  market_avg: number | null
  market_min: number | null
  market_max: number | null
  sources: string[]
  updated_at: string | null
}

/* ============================
   LEGACY ML PRICE (DUMMY)
============================ */

export interface MLPrice {
  query: string
  market_avg: number | null
  market_min: number | null
  market_max: number | null
  sources: string[]
  updated_at: string | null
}

/* ============================
   API CALLS — /api/ FIX
============================ */

export async function getMarketPrice(material: string): Promise<MarketPrice> {
  return ensure(
    await apiFetch<MarketPrice>(
      `/api/market/price/?material=${encodeURIComponent(material)}`
    ),
    "Error al obtener precio de mercado"
  )
}

export async function getMLPrice(material: string): Promise<MLPrice> {
  return ensure(
    await apiFetch<MLPrice>(
      `/api/market/ml/?material=${encodeURIComponent(material)}`
    ),
    "Error al obtener precio ML"
  )
}

/* Opcional: obtener lista de materiales */
export async function getMaterialList(): Promise<string[]> {
  return ensure(
    await apiFetch<string[]>("/api/market/materials/"),
    "Error al obtener lista de materiales"
  )
}
