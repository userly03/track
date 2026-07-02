"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getDocumentHistory,
  type DocumentHistoryEntry,
} from "@/src/lib/api/documents";

import "@/styles/projects-admin.css";

import "@/styles/table.css";
import "@/styles/documents-admin.css";

export default function DocumentHistoryPage({
  params,
}: {
  params: { id: string };
}) {
  const router = useRouter();
  const documentId = Number(params.id);

  const [history, setHistory] = useState<DocumentHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadHistory();
  }, []);

  async function loadHistory() {
    try {
      setLoading(true);
      const data = await getDocumentHistory(documentId);
      setHistory(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err.message || "Error al cargar historial");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="projects-container">
        <div className="table-loading">Cargando historial...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="projects-container">
        <div className="table-empty">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="projects-container">
      {/* HEADER */}
      <div className="projects-header">
        <div>
          <h1 className="projects-title" style={{ color: "#b91c1c" }}>
            Historial del Documento
          </h1>
          <p className="projects-subtitle">
            Registro cronológico de cambios, versiones y eventos.
          </p>
        </div>

        <button
          className="btn-secondary"
          style={{ borderColor: "#b91c1c", color: "#b91c1c" }}
          onClick={() => router.push(`/admin/documents/${documentId}`)}
        >
          ← Volver al Documento
        </button>
      </div>

      {/* TIMELINE */}
      <div className="doc-history-container">
        {history.length === 0 ? (
          <div className="table-empty">No hay historial disponible.</div>
        ) : (
          <div className="doc-timeline">
            {Array.isArray(history) &&
              history.map((entry) => (
                <div key={entry.id} className="doc-timeline-item">
                  {/* Línea + Punto */}
                  <div className="doc-timeline-marker" />

                  {/* Contenido */}
                  <div className="doc-timeline-content">
                    {/* ENCABEZADO */}
                    <div className="doc-timeline-header">
                      <span className="doc-timeline-version">
                        v{entry.version}
                      </span>

                      <span className="doc-timeline-event">{entry.event}</span>

                      <span className="doc-timeline-date">
                        {new Date(entry.created_at).toLocaleString("es-PE")}
                      </span>
                    </div>

                    {/* DETALLES */}
                    <div className="doc-timeline-body">
                      <p className="doc-timeline-user">
                        <strong>Usuario:</strong> {entry.user}
                      </p>

                      {entry.comment && (
                        <p className="doc-timeline-comment">
                          <strong>Comentario:</strong> {entry.comment}
                        </p>
                      )}

                      {/* HASHES */}
                      <div className="doc-timeline-hashes">
                        <div className="doc-timeline-hash">
                          <span className="hash-label">File Hash:</span>
                          <span className="hash-value-small">
                            {entry.file_hash}
                          </span>
                        </div>

                        <div className="doc-timeline-hash">
                          <span className="hash-label">Content Hash:</span>
                          <span className="hash-value-small">
                            {entry.content_hash}
                          </span>
                        </div>

                        <div className="doc-timeline-hash">
                          <span className="hash-label">Previous Hash:</span>
                          <span className="hash-value-small">
                            {entry.previous_hash}
                          </span>
                        </div>
                      </div>

                      {/* METADATA */}
                      {entry.metadata &&
                        Object.keys(entry.metadata).length > 0 && (
                          <div className="doc-timeline-metadata">
                            <h4 className="doc-metadata-title">
                              Metadata Snapshot
                            </h4>
                            <pre className="doc-metadata-json">
                              {JSON.stringify(entry.metadata, null, 2)}
                            </pre>
                          </div>
                        )}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
