// src/lib/api/documents.ts
import { apiFetch } from "./client"

type ApiResponse<T> = { ok: boolean; data?: T; error?: string }
function ensure<T>(res: ApiResponse<T>, msg: string): T {
  if (!res.ok || res.data === undefined) throw new Error(res.error || msg)
  return res.data
}

/* ============================
      MODELOS
============================ */

export interface Document {
  id: number
  projectId: number
  purchaseId?: number
  deliveryId?: number
  progressReportId?: number
  title: string
  description: string
  file?: string
  fileUrl: string
  status: "pending" | "approved" | "observed"
  metadata: Record<string, any>
  version_number: number
  file_hash: string
  content_hash: string
  previous_hash: string
  is_duplicate: boolean
  originalDocumentId?: number
  author: string
  document_type: string
  issue_date: string
  responsible_area: string
  sensitivity_level: "public" | "internal" | "confidential" | "restricted"
  lastModifiedBy: string
  created_at: string
  updated_at: string
}

export interface CreateDocumentData {
  projectId: number
  purchaseId?: number
  deliveryId?: number
  progressReportId?: number
  title: string
  description: string
  file: File
  metadata?: Record<string, any>
  author: string
  document_type: string
  issue_date: string
  responsible_area: string
  sensitivity_level: "public" | "internal" | "confidential" | "restricted"
}

export interface UpdateDocumentData {
  title?: string
  description?: string
  status?: "pending" | "approved" | "observed"
  metadata?: Record<string, any>
  author?: string
  document_type?: string
  issue_date?: string
  responsible_area?: string
  sensitivity_level?: "public" | "internal" | "confidential" | "restricted"
}

export interface DocumentVersion {
  version: number
  hash: string
  created_at: string
  is_current: boolean
}

export interface DocumentHistoryEntry {
  id: number
  version: number
  event: string
  user: string
  comment: string
  file_hash: string
  content_hash: string
  previous_hash: string
  metadata: Record<string, any>
  created_at: string
}

interface DocumentVersionsResponse {
  document_id: number
  current_version: number
  versions: Array<{
    version: number
    hash: string
    created_at: string
  }>
}

interface DocumentHistoryApiEntry {
  id: number
  version_number: number
  event_type: string
  performedBy: string | null
  comment: string
  file_hash: string
  content_hash: string
  previous_hash: string
  metadata_snapshot: Record<string, any>
  created_at: string
}

/* ================================
      API CALLS — /api/ FIX
================================ */

export async function getDocuments(): Promise<Document[]> {
  return ensure(
    await apiFetch<Document[]>("/api/documents/"),
    "Error al cargar documentos"
  )
}

export async function getDocument(id: number): Promise<Document> {
  return ensure(
    await apiFetch<Document>(`/api/documents/${id}/`),
    "Error al cargar documento"
  )
}

export async function createLegacyDocument(data: FormData): Promise<Document> {
  return ensure(
    await apiFetch<Document>("/api/documents/", {
      method: "POST",
      body: data,
    }),
    "Error al crear documento"
  )
}

export async function updateDocument(id: number, data: UpdateDocumentData): Promise<Document> {
  return ensure(
    await apiFetch<Document>(`/api/documents/${id}/`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
    "Error al actualizar documento"
  )
}

export async function deleteDocument(id: number): Promise<void> {
  ensure(
    await apiFetch<void>(`/api/documents/${id}/`, { method: "DELETE" }),
    "Error al eliminar documento"
  )
}

export async function uploadDocument(formData: FormData): Promise<Document> {
  return ensure(
    await apiFetch<Document>("/api/documents/upload/", {
      method: "POST",
      body: formData,
    }),
    "Error al subir documento"
  )
}

export async function getDocumentVersions(id: number): Promise<DocumentVersion[]> {
  const data = ensure(
    await apiFetch<DocumentVersionsResponse>(`/api/documents/${id}/versions/`),
    "Error al cargar versiones"
  )

  return data.versions.map((version) => ({
    ...version,
    is_current: version.version === data.current_version,
  }))
}

export async function getDocumentHistory(id: number): Promise<DocumentHistoryEntry[]> {
  const data = ensure(
    await apiFetch<DocumentHistoryApiEntry[]>(`/api/documents/${id}/history/`),
    "Error al cargar historial"
  )

  return data.map((entry) => ({
    id: entry.id,
    version: entry.version_number,
    event: entry.event_type,
    user: entry.performedBy || "Sistema",
    comment: entry.comment,
    file_hash: entry.file_hash,
    content_hash: entry.content_hash,
    previous_hash: entry.previous_hash,
    metadata: entry.metadata_snapshot,
    created_at: entry.created_at,
  }))
}

/* ================================
        DOWNLOAD — /api/ FIX
================================ */

export async function downloadDocument(id: number): Promise<Blob> {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8081"
  const accessToken = localStorage.getItem("access_token")

  const response = await fetch(`${baseUrl}/api/documents/${id}/download/`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!response.ok) throw new Error("Error al descargar documento")

  return response.blob()
}
