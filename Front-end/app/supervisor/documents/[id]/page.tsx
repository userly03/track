"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getDocument,
  downloadDocument,
  type Document,
} from "@/src/lib/api/documents";

import "@/styles/supervisor-document-detail.css";

export default function SupervisorDocumentDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const router = useRouter();

  const [doc, setDoc] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadDocument();
  }, []);

  async function loadDocument() {
    try {
      setLoading(true);
      const data = await getDocument(Number(params.id));
      setDoc(data);
    } catch (err: any) {
      setError(err.message || "Error al cargar documento");
    } finally {
      setLoading(false);
    }
  }

  async function handleDownload() {
    if (!doc) return;

    try {
      const blob = await downloadDocument(doc.id);
      const url = window.URL.createObjectURL(blob);

      const link = window.document.createElement("a");
      link.href = url;
      link.download = doc.title || `document-${doc.id}`;

      window.document.body.appendChild(link);
      link.click();

      window.URL.revokeObjectURL(url);
      window.document.body.removeChild(link);
    } catch (err: any) {
      alert(`Error al descargar: ${err.message}`);
    }
  }

  if (loading) {
    return (
      <div className="doc-page">
        <div className="loading-box">Cargando documento...</div>
      </div>
    );
  }

  if (error || !doc) {
    return (
      <div className="doc-page">
        <div className="error-box">
          Error: {error || "Documento no encontrado"}
        </div>
      </div>
    );
  }

  return (
    <div className="doc-page">
      {/* HEADER */}
      <div className="page-header">
        <h1 className="page-title">Documento #{doc.id}</h1>

        <div className="actions">
          <button className="btn-back" onClick={() => router.back()}>
            ← Volver
          </button>
          <button className="btn-download" onClick={handleDownload}>
            Descargar
          </button>
        </div>
      </div>

      {/* FILE CARD */}
      <div className="card">
        {doc.is_duplicate && (
          <div className="duplicate-warning">
            ⚠ Este documento es un duplicado del documento original #
            {doc.originalDocumentId}
          </div>
        )}

        <div className="file-section">
          <h2 className="card-title">Archivo</h2>

          <a
            href={doc.fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="file-link"
          >
            {doc.title}
          </a>

          <p className="file-url">URL: {doc.fileUrl}</p>
        </div>
      </div>

      {/* HASHES */}
      <div className="card">
        <h2 className="card-title">Hashes Blockchain</h2>

        <div className="hash-grid">
          <div className="hash-item">
            <label>File Hash</label>
            <span>{doc.file_hash}</span>
          </div>
          <div className="hash-item">
            <label>Content Hash</label>
            <span>{doc.content_hash}</span>
          </div>
          <div className="hash-item">
            <label>Previous Hash</label>
            <span>{doc.previous_hash}</span>
          </div>
        </div>
      </div>

      {/* DETAILS */}
      <div className="card">
        <h2 className="card-title">Detalles</h2>

        <div className="detail-grid">
          <div className="detail-item">
            <label>Título</label>
            <p>{doc.title}</p>
          </div>

          <div className="detail-item">
            <label>Estado</label>
            <span className={`status-badge status-${doc.status}`}>
              {doc.status}
            </span>
          </div>

          <div className="detail-item full">
            <label>Descripción</label>
            <p>{doc.description || "-"}</p>
          </div>

          <div className="detail-item">
            <label>Autor</label>
            <p>{doc.author}</p>
          </div>

          <div className="detail-item">
            <label>Tipo</label>
            <p>{doc.document_type}</p>
          </div>

          <div className="detail-item">
            <label>Emisión</label>
            <p>{new Date(doc.issue_date).toLocaleDateString()}</p>
          </div>

          <div className="detail-item">
            <label>Área Responsable</label>
            <p>{doc.responsible_area}</p>
          </div>

          <div className="detail-item">
            <label>Sensibilidad</label>
            <p>{doc.sensitivity_level}</p>
          </div>

          <div className="detail-item full">
            <label>Metadata</label>
            <pre className="json-box">
              {JSON.stringify(doc.metadata, null, 2)}
            </pre>
          </div>

          <div className="detail-item">
            <label>Versión</label>
            <p>v{doc.version_number}</p>
          </div>

          <div className="detail-item">
            <label>Última Modificación</label>
            <p>{doc.lastModifiedBy}</p>
          </div>

          <div className="detail-item">
            <label>Creado</label>
            <p>{new Date(doc.created_at).toLocaleString()}</p>
          </div>

          <div className="detail-item">
            <label>Actualizado</label>
            <p>{new Date(doc.updated_at).toLocaleString()}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
