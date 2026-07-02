"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import {
  getDocument,
  updateDocument,
  downloadDocument,
  type Document,
} from "@/src/lib/api/documents";

import "@/styles/forms.css";
import "@/styles/projects-admin.css";
import "@/styles/documents-admin.css";
import "@/styles/modal.css";

export default function DocumentDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const router = useRouter();

  // ============================
  // VALIDACIÓN DE ID + DEBUG
  // ============================

  // Ver qué llega desde Next.js
  console.log("📌 params.id =", params?.id);

  const rawId = params?.id;

  // Revisar tipo y valor
  console.log("📌 rawId =", rawId, " typeof =", typeof rawId);

  // Convertir a número solo si es válido (solo dígitos)
  const documentId = rawId && /^[0-9]+$/.test(rawId) ? Number(rawId) : null;

  // Ver número final usado
  console.log("📌 documentId =", documentId);

  // Si no es válido, no llamar al backend
  if (!documentId) {
    console.error(
      "❌ ERROR: ID inválido en DocumentDetailPage. params.id =",
      rawId
    );
    return (
      <div className="documents-wrapper">
        <div className="table-error">ID inválido o no recibido: "{rawId}"</div>
      </div>
    );
  }

  // ============================
  // ESTADOS DEL DOCUMENTO
  // ============================

  const [document, setDocument] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    status: "pending" as "pending" | "approved" | "observed",
    metadata: "{}",
    author: "",
    document_type: "",
    issue_date: "",
    responsible_area: "",
    sensitivity_level: "internal" as
      | "public"
      | "internal"
      | "confidential"
      | "restricted",
  });

  // ============================
  // CARGAR DOCUMENTO
  // ============================

  useEffect(() => {
    loadDocument();
  }, []);

  async function loadDocument() {
    try {
      setLoading(true);

      console.log("📌 Llamando a getDocument con ID =", documentId);

      const data = await getDocument(documentId!);

      setDocument(data);

      setFormData({
        title: data.title ?? "",
        description: data.description ?? "",
        status: data.status ?? "pending",
        metadata: JSON.stringify(data.metadata ?? {}, null, 2),
        author: data.author ?? "",
        document_type: data.document_type ?? "",
        issue_date: data.issue_date ? data.issue_date.split("T")[0] : "",
        responsible_area: data.responsible_area ?? "",
        sensitivity_level: data.sensitivity_level ?? "internal",
      });
    } catch (err: any) {
      console.error("❌ ERROR en loadDocument():", err);
      setError(err.message || "Error al cargar documento");
    } finally {
      setLoading(false);
    }
  }

  // ============================
  // VALIDACIÓN DE METADATA
  // ============================

  function validateMetadata(text: string): boolean {
    try {
      JSON.parse(text);
      return true;
    } catch {
      return false;
    }
  }

  // ============================
  // ACTUALIZAR DOCUMENTO
  // ============================

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!validateMetadata(formData.metadata)) {
      setError("El metadata no es JSON válido");
      return;
    }

    try {
      setSaving(true);
      setError("");

      await updateDocument(documentId!, {
        title: formData.title,
        description: formData.description,
        status: formData.status,
        metadata: JSON.parse(formData.metadata),
        author: formData.author,
        document_type: formData.document_type,
        issue_date: formData.issue_date,
        responsible_area: formData.responsible_area,
        sensitivity_level: formData.sensitivity_level,
      });

      alert("Documento actualizado correctamente");
      loadDocument();
    } catch (err: any) {
      console.error("❌ ERROR actualizando documento:", err);
      setError(err.message || "Error al actualizar documento");
    } finally {
      setSaving(false);
    }
  }

  // ============================
  // DESCARGAR DOCUMENTO
  // ============================

  async function handleDownload() {
    if (!document) return;

    try {
      const blob = await downloadDocument(document.id);
      const url = window.URL.createObjectURL(blob);

      const a = window.document.createElement("a");
      a.href = url;
      a.download = document.title || `document-${document.id}`;
      window.document.body.appendChild(a);
      a.click();
      window.document.body.removeChild(a);

      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(`Error al descargar: ${err.message}`);
    }
  }

  // ============================
  // LOADING / ERROR UI
  // ============================

  if (loading) {
    return (
      <div className="documents-wrapper">
        <div className="table-loading">Cargando documento...</div>
      </div>
    );
  }

  if (error || !document) {
    return (
      <div className="documents-wrapper">
        <div className="table-error">
          Error: {error || "Documento no encontrado"}
        </div>
      </div>
    );
  }

  return (
    <div className="documents-wrapper">
      {/* HEADER */}
      <div className="documents-header">
        <div>
          <h1 className="documents-title">Detalle del Documento</h1>
          <p className="documents-subtitle">
            Revisa, edita y valida información documental.
          </p>
        </div>

        <div className="documents-actions">
          <button
            className="btn-secondary"
            onClick={() => router.push("/admin/documents")}
          >
            ← Volver
          </button>

          <button className="btn-primary" onClick={handleDownload}>
            Descargar
          </button>

          <button
            className="btn-secondary"
            onClick={() =>
              router.push(`/admin/documents/${documentId}/versions`)
            }
          >
            Versiones
          </button>

          <button
            className="btn-secondary"
            onClick={() =>
              router.push(`/admin/documents/${documentId}/history`)
            }
          >
            Historial
          </button>
        </div>
      </div>

      {/* DUPLICADO */}
      {document.is_duplicate && (
        <div className="doc-duplicate-alert">
          ⚠ Este documento es un duplicado
        </div>
      )}

      {/* ARCHIVO */}
      <div className="doc-file-section">
        <h2 className="section-title">Archivo</h2>

        <a
          href={document.fileUrl ?? "#"}
          target="_blank"
          rel="noopener noreferrer"
          className="doc-file-link"
        >
          {document.title}
        </a>

        <p className="doc-file-url">
          {document.fileUrl ?? "Sin URL disponible"}
        </p>
      </div>

      {/* HASHES */}
      <div className="doc-hashes-section">
        <h2 className="section-title">Integridad Blockchain</h2>

        <div className="hash-list">
          <div className="hash-item">
            <span className="hash-label">File Hash:</span>
            <span className="hash-value">{document.file_hash ?? "N/A"}</span>
          </div>

          <div className="hash-item">
            <span className="hash-label">Content Hash:</span>
            <span className="hash-value">{document.content_hash ?? "N/A"}</span>
          </div>

          <div className="hash-item">
            <span className="hash-label">Previous Hash:</span>
            <span className="hash-value">
              {document.previous_hash ?? "N/A"}
            </span>
          </div>
        </div>
      </div>

      {/* FORM */}
      <div className="form-card">
        {error && <div className="form-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="doc-form-grid">
            {/* TITULO */}
            <div className="form-group">
              <label>Título *</label>
              <input
                type="text"
                disabled={saving}
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
              />
            </div>

            {/* DESCRIPCIÓN */}
            <div className="form-group full-width">
              <label>Descripción</label>
              <textarea
                rows={3}
                disabled={saving}
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
              />
            </div>

            {/* AUTOR */}
            <div className="form-group">
              <label>Autor *</label>
              <input
                type="text"
                disabled={saving}
                value={formData.author}
                onChange={(e) =>
                  setFormData({ ...formData, author: e.target.value })
                }
              />
            </div>

            {/* TIPO */}
            <div className="form-group">
              <label>Tipo *</label>
              <input
                type="text"
                disabled={saving}
                value={formData.document_type}
                onChange={(e) =>
                  setFormData({ ...formData, document_type: e.target.value })
                }
              />
            </div>

            {/* FECHA */}
            <div className="form-group">
              <label>Fecha de Emisión *</label>
              <input
                type="date"
                disabled={saving}
                value={formData.issue_date}
                onChange={(e) =>
                  setFormData({ ...formData, issue_date: e.target.value })
                }
              />
            </div>

            {/* AREA */}
            <div className="form-group">
              <label>Área Responsable *</label>
              <input
                type="text"
                disabled={saving}
                value={formData.responsible_area}
                onChange={(e) =>
                  setFormData({ ...formData, responsible_area: e.target.value })
                }
              />
            </div>

            {/* SENSIBILIDAD */}
            <div className="form-group">
              <label>Nivel de Sensibilidad</label>
              <select
                disabled={saving}
                value={formData.sensitivity_level}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    sensitivity_level: e.target.value as any,
                  })
                }
              >
                <option value="public">Público</option>
                <option value="internal">Interno</option>
                <option value="confidential">Confidencial</option>
                <option value="restricted">Restringido</option>
              </select>
            </div>
          </div>

          {/* INFO EXTRA (con protección) */}
          <div className="doc-metadata">
            <p>
              <strong>Versión actual:</strong> v{document.version_number ?? "1"}
            </p>
            <p>
              <strong>Última modificación por:</strong>{" "}
              {document.lastModifiedBy ?? "Desconocido"}
            </p>
            <p>
              <strong>Creado:</strong>{" "}
              {document.created_at
                ? new Date(document.created_at).toLocaleString("es-PE")
                : "N/A"}
            </p>
            <p>
              <strong>Actualizado:</strong>{" "}
              {document.updated_at
                ? new Date(document.updated_at).toLocaleString("es-PE")
                : "N/A"}
            </p>
          </div>

          {/* ACCIONES */}
          <div className="form-actions">
            <button
              type="button"
              className="btn-secondary"
              disabled={saving}
              onClick={() => router.push("/admin/documents")}
            >
              Cancelar
            </button>

            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? "Guardando..." : "Guardar Cambios"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
