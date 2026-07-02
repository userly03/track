"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import {
  getDocuments,
  deleteDocument,
  downloadDocument,
  type Document,
} from "@/src/lib/api/documents";

import { getProjects, type Project } from "@/src/lib/api/projects";

import "@/styles/projects-admin.css";
import "@/styles/table.css";
import "@/styles/documents-admin.css";
import "@/styles/modal.css";

export default function DocumentsPage() {
  const router = useRouter();

  const [documents, setDocuments] = useState<Document[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [deleteModal, setDeleteModal] = useState<{
    open: boolean;
    documentId: number | null;
  }>({
    open: false,
    documentId: null,
  });

  /* ============================
      LOAD DATA
  ============================ */
  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const [documentsData, projectsData] = await Promise.all([
        getDocuments(),
        getProjects(),
      ]);

      setDocuments(Array.isArray(documentsData) ? documentsData : []); // ← PARCHE
      setProjects(Array.isArray(projectsData) ? projectsData : []); // ← PARCHE
    } catch (err: any) {
      setError(err.message || "Error al cargar documentos");
    } finally {
      setLoading(false);
    }
  }

  /* ============================
      HELPERS
  ============================ */
  function getProjectName(projectId: number): string {
    return (
      projects.find((p) => p.id === projectId)?.name || `Proyecto #${projectId}`
    );
  }

  async function handleDelete(id: number) {
    try {
      await deleteDocument(id);
      setDocuments((prev) => prev.filter((d) => d.id !== id));
      setDeleteModal({ open: false, documentId: null });
    } catch (err: any) {
      alert(`Error al eliminar documento: ${err.message}`);
    }
  }

  async function handleDownload(id: number, title: string) {
    try {
      const blob = await downloadDocument(id);
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = title || `documento-${id}`;
      document.body.appendChild(a);
      a.click();

      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      alert(`Error al descargar documento: ${err.message}`);
    }
  }

  /* ============================
      LOADING & ERROR UI
  ============================ */
  if (loading) {
    return (
      <div className="documents-wrapper">
        <div className="table-loading">Cargando documentos...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="documents-wrapper">
        <div className="table-error">Error: {error}</div>
      </div>
    );
  }

  /* ============================
      UI
  ============================ */
  return (
    <div className="documents-wrapper">
      {/* HEADER */}
      <div className="documents-header">
        <div>
          <h1 className="documents-title">Gestión de Documentos</h1>
          <p className="documents-subtitle">
            Mantén actualizado el repositorio documental del proyecto.
          </p>
        </div>

        <div className="documents-actions">
          <button
            className="btn-secondary"
            onClick={() => router.push("/admin")}
          >
            ← Volver
          </button>

          <button
            className="btn-primary"
            onClick={() => router.push("/admin/documents/upload")}
          >
            + Subir Documento
          </button>
        </div>
      </div>

      {/* TABLE */}
      <div className="table-container">
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Título</th>
                <th>Proyecto</th>
                <th>Estado</th>
                <th>Versión</th>
                <th>Autor</th>
                <th>Tipo</th>
                <th>Fecha Emisión</th>
                <th>Duplicado</th>
                <th>Acciones</th>
              </tr>
            </thead>

            <tbody>
              {/* SIEMPRE SEGURO */}
              {documents.length === 0 ? (
                <tr>
                  <td colSpan={9} className="table-empty">
                    No hay documentos registrados
                  </td>
                </tr>
              ) : (
                Array.isArray(documents) &&
                documents.map((doc) => (
                  <tr key={doc.id}>
                    <td className="doc-title-cell">{doc.title}</td>

                    <td>{getProjectName(doc.projectId)}</td>

                    <td>
                      <span className={`doc-status-badge ${doc.status}`}>
                        {doc.status}
                      </span>
                    </td>

                    <td>
                      <span className="doc-version">v{doc.version_number}</span>
                    </td>

                    <td>{doc.author}</td>

                    <td>{doc.document_type}</td>

                    <td>
                      {doc.issue_date
                        ? new Date(doc.issue_date).toLocaleDateString("es-PE")
                        : "--"}
                    </td>

                    <td>
                      {doc.is_duplicate && (
                        <span className="doc-duplicate-badge">Duplicado</span>
                      )}
                    </td>

                    <td>
                      <div className="table-actions">
                        <button
                          className="btn-secondary"
                          onClick={() =>
                            router.push(`/admin/documents/${doc.id}`)
                          }
                        >
                          Ver / Editar
                        </button>

                        <button
                          className="btn-primary"
                          onClick={() => handleDownload(doc.id, doc.title)}
                        >
                          Descargar
                        </button>

                        <button
                          className="btn-danger"
                          onClick={() =>
                            setDeleteModal({
                              open: true,
                              documentId: doc.id,
                            })
                          }
                        >
                          Eliminar
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

      {/* DELETE MODAL */}
      {deleteModal.open && (
        <div
          className="modal-overlay"
          onClick={() => setDeleteModal({ open: false, documentId: null })}
        >
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">Confirmar eliminación</h2>

            <p className="modal-text">
              ¿Quieres eliminar este documento de forma permanente?
            </p>

            <div className="modal-actions">
              <button
                className="btn-secondary"
                onClick={() =>
                  setDeleteModal({ open: false, documentId: null })
                }
              >
                Cancelar
              </button>

              <button
                className="btn-danger"
                onClick={() =>
                  deleteModal.documentId && handleDelete(deleteModal.documentId)
                }
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
