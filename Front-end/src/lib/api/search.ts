// src/lib/api/search.ts
import { apiFetch } from "./client"

type ApiResponse<T> = { ok: boolean; data?: T; error?: string }
function ensure<T>(res: ApiResponse<T>, msg: string): T {
  if (!res.ok || res.data === undefined) throw new Error(res.error || msg)
  return res.data
}

export type SearchResultType =
  | "project"
  | "purchase"
  | "delivery"
  | "progress_report"
  | "document"
  | "alert"

export interface SearchResult {
  type: SearchResultType
  id: number
  score: number
  label: string
  project_id: number | null
  project_code: string | null
  metadata: Record<string, any>
}

export interface SearchPagination {
  page: number
  page_size: number
  total_items: number
  total_pages: number
}

export interface SearchResponse {
  results: SearchResult[]
  pagination: SearchPagination
}

export interface SearchFilters {
  project_status?: string
  project_code?: string
  supplier?: string
  min_price?: number
  max_price?: number
  min_quantity?: number
  max_quantity?: number
  progress_status?: string
  date_from?: string
  date_to?: string
  document_type?: string
  version_number?: number
  severity?: string
  item_type?: string
}

export interface GlobalSearchParams {
  q: string
  page?: number
  page_size?: number
  ordering?: "-score" | "score"
  filters?: SearchFilters
}

type BackendSearchFilters = {
  projects?: {
    status?: string
    code?: string
    start_date_from?: string
    start_date_to?: string
  }
  purchases?: {
    supplier?: string
    min_price?: number
    max_price?: number
    date_from?: string
    date_to?: string
  }
  deliveries?: {
    min_quantity?: number
    max_quantity?: number
    date_from?: string
    date_to?: string
  }
  progress_reports?: {
    status?: string
    date_from?: string
    date_to?: string
  }
  documents?: {
    document_type?: string
    version_number?: number
    issue_date_from?: string
    issue_date_to?: string
  }
  alerts?: {
    severity?: string
    item_type?: string
    date_from?: string
    date_to?: string
  }
}

function buildBackendFilters(filters: SearchFilters): BackendSearchFilters {
  const backendFilters: BackendSearchFilters = {}

  const projects = {
    status: filters.project_status,
    code: filters.project_code,
    start_date_from: filters.date_from,
    start_date_to: filters.date_to,
  }
  if (Object.values(projects).some((value) => value !== undefined && value !== "")) {
    backendFilters.projects = projects
  }

  const purchases = {
    supplier: filters.supplier,
    min_price: filters.min_price,
    max_price: filters.max_price,
    date_from: filters.date_from,
    date_to: filters.date_to,
  }
  if (Object.values(purchases).some((value) => value !== undefined && value !== "")) {
    backendFilters.purchases = purchases
  }

  const deliveries = {
    min_quantity: filters.min_quantity,
    max_quantity: filters.max_quantity,
    date_from: filters.date_from,
    date_to: filters.date_to,
  }
  if (Object.values(deliveries).some((value) => value !== undefined && value !== "")) {
    backendFilters.deliveries = deliveries
  }

  const progressReports = {
    status: filters.progress_status,
    date_from: filters.date_from,
    date_to: filters.date_to,
  }
  if (Object.values(progressReports).some((value) => value !== undefined && value !== "")) {
    backendFilters.progress_reports = progressReports
  }

  const documents = {
    document_type: filters.document_type,
    version_number: filters.version_number,
    issue_date_from: filters.date_from,
    issue_date_to: filters.date_to,
  }
  if (Object.values(documents).some((value) => value !== undefined && value !== "")) {
    backendFilters.documents = documents
  }

  const alerts = {
    severity: filters.severity,
    item_type: filters.item_type,
    date_from: filters.date_from,
    date_to: filters.date_to,
  }
  if (Object.values(alerts).some((value) => value !== undefined && value !== "")) {
    backendFilters.alerts = alerts
  }

  return backendFilters
}

/* ========================================
      GLOBAL SEARCH — /api/ FIX
======================================== */

export async function globalSearch(params: GlobalSearchParams): Promise<SearchResponse> {
  const { q, page = 1, page_size = 20, ordering = "-score", filters = {} } = params

  const queryParams = new URLSearchParams()
  queryParams.append("q", q)
  queryParams.append("page", page.toString())
  queryParams.append("page_size", page_size.toString())
  queryParams.append("ordering", ordering)

  if (Object.keys(filters).length > 0) {
    queryParams.append("filters", JSON.stringify(buildBackendFilters(filters)))
  }

  return ensure(
    await apiFetch<SearchResponse>(`/api/search/?${queryParams.toString()}`),
    "Error en la búsqueda global"
  )
}
