"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getDocumentVersions,
  type DocumentVersion,
} from "@/src/lib/api/documents";

import "@/styles/projects-admin.css";

import "@/styles/table.css";
import "@/styles/documents-admin.css";

export default function DocumentVersionsPage({
  params,
}: {
  params: { id: string };
}) {
  const router = useRouter();
  const documentId = Number(params.id);

  const [versions, setVersions] = useState<DocumentVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadVersions();
  }, []);

  async function loadVersions() {
    try {
      setLoading(true);
      const data = await getDocumentVersions(documentId);
      setVersions(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err.message || "Error al cargar versiones del documento");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="projects-container">
        <div className="table-loading">Cargando versiones...</div>
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
            Versiones del Documento
          </h1>
          <p className="projects-subtitle">
            Historial completo de cambios y hashes blockchain.
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

      {/* TABLA */}
      <div className="table-container">
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Versión</th>
                <th>Hash</th>
                <th>Fecha</th>
                <th>Estado</th>
              </tr>
            </thead>

            <tbody>
              {versions.length === 0 ? (
                <tr>
                  <td colSpan={4} className="table-empty">
                    No hay versiones registradas para este documento.
                  </td>
                </tr>
              ) : (
                Array.isArray(versions) &&
                versions.map((v) => (
                  <tr key={v.version}>
                    {/* Versión */}
                    <td>
                      <span className="doc-version-badge">v{v.version}</span>
                      {v.is_current && (
                        <span className="doc-current-tag">Actual</span>
                      )}
                    </td>

                    {/* Hash */}
                    <td>
                      <span className="doc-hash">{v.hash}</span>
                    </td>

                    {/* Fecha */}
                    <td>{new Date(v.created_at).toLocaleString()}</td>

                    {/* Estado */}
                    <td>
                      <span
                        className={`doc-status-badge ${
                          v.is_current ? "approved" : "pending"
                        }`}
                      >
                        {v.is_current ? "Actual" : "Histórica"}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
