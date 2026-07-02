"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import {
  getDocuments,
  downloadDocument,
  type Document,
} from "@/src/lib/api/documents";
import { getProjects, type Project } from "@/src/lib/api/projects";

import "@/styles/supervisor-documents.css";

export default function SupervisorDocumentsPage() {
  const router = useRouter();

  const [documents, setDocuments] = useState<Document[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);

      const [docs, projs] = await Promise.all([getDocuments(), getProjects()]);

      setDocuments(docs);
      setProjects(projs);
    } catch (err: any) {
      setError(err.message || "Error al cargar documentos");
    } finally {
      setLoading(false);
    }
  }

  function getProjectName(projectId: number) {
    return (
      projects.find((p) => p.id === projectId)?.name || `Proyecto #${projectId}`
    );
  }

  async function handleDownload(id: number, title: string) {
    try {
      const blob = await downloadDocument(id);

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = title || `document-${id}`;
      document.body.appendChild(a);

      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      alert(`Error al descargar: ${err.message}`);
    }
  }

  if (loading) {
    return (
      <div className="documents-page">
        <div className="loading-box">Cargando documentos...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="documents-page">
        <div className="error-box">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="documents-page">
      <div className="page-header">
        <h1 className="page-title">Documentos (Solo Lectura)</h1>
      </div>

      <div className="table-card">
        <table className="documents-table">
          <thead>
            <tr>
              <th>Título</th>
              <th>Proyecto</th>
              <th>Estado</th>
              <th>Versión</th>
              <th>Autor</th>
              <th>Tipo</th>
              <th>Emisión</th>
              <th>Duplicado</th>
              <th>Acciones</th>
            </tr>
          </thead>

          <tbody>
            {documents.length === 0 ? (
              <tr>
                <td colSpan={9} className="empty-message">
                  No hay documentos registrados
                </td>
              </tr>
            ) : (
              documents.map((doc) => (
                <tr key={doc.id}>
                  <td className="doc-title">{doc.title}</td>
                  <td>{getProjectName(doc.projectId)}</td>

                  <td>
                    <span className={`doc-status status-${doc.status}`}>
                      {doc.status}
                    </span>
                  </td>

                  <td>v{doc.version_number}</td>

                  <td>{doc.author}</td>
                  <td>{doc.document_type}</td>

                  <td>{new Date(doc.issue_date).toLocaleDateString()}</td>

                  <td>
                    {doc.is_duplicate && (
                      <span className="badge-duplicate">Duplicado</span>
                    )}
                  </td>

                  <td>
                    <div className="table-actions">
                      <button
                        className="btn-view"
                        onClick={() =>
                          router.push(`/supervisor/documents/${doc.id}`)
                        }
                      >
                        Ver
                      </button>

                      <button
                        className="btn-download"
                        onClick={() => handleDownload(doc.id, doc.title)}
                      >
                        Descargar
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
