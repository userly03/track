"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

import { uploadDocument } from "@/src/lib/api/documents";
import { getProjects, type Project } from "@/src/lib/api/projects";

import "@/styles/documents-admin.css";

export default function UploadDocumentPage() {
  const router = useRouter();

  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [uploadResult, setUploadResult] = useState<{
    success: boolean;
    message: string;
    isDuplicate: boolean;
  } | null>(null);

  const [formData, setFormData] = useState({
    projectId: "",
    title: "",
    description: "",
    file: null as File | null,
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

  const [errors, setErrors] = useState<Record<string, string>>({});

  /** Cargar proyectos */
  useEffect(() => {
    loadProjects();
  }, []);

  async function loadProjects() {
    try {
      const data = await getProjects();
      setProjects(data);
    } catch (err: any) {
      setError(err.message || "Error al cargar proyectos");
    }
  }

  /** Validaciones */
  function validateForm(): boolean {
    const newErrors: Record<string, string> = {};

    if (!formData.projectId) newErrors.projectId = "Selecciona un proyecto";
    if (!formData.title.trim()) newErrors.title = "El título es obligatorio";
    if (!formData.author.trim()) newErrors.author = "El autor es obligatorio";
    if (!formData.document_type.trim())
      newErrors.document_type = "El tipo es obligatorio";
    if (!formData.issue_date)
      newErrors.issue_date = "La fecha de emisión es obligatoria";
    if (!formData.responsible_area.trim())
      newErrors.responsible_area = "El área responsable es obligatoria";

    if (!formData.file) {
      newErrors.file = "Debe seleccionar un archivo";
    } else {
      const file = formData.file;
      const validExt = ["pdf", "jpg", "jpeg", "png"];
      const ext = file.name.split(".").pop()?.toLowerCase();

      if (!ext || !validExt.includes(ext)) {
        newErrors.file = "Formato inválido. Solo PDF/JPG/JPEG/PNG";
      }

      if (file.size > 10 * 1024 * 1024) {
        newErrors.file = "El archivo no debe superar los 10MB";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  /** Subir documento */
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      setLoading(true);
      setError("");
      setUploadResult(null);

      const data = new FormData();
      data.append("projectId", formData.projectId);
      data.append("title", formData.title);
      data.append("description", formData.description || "");
      if (formData.file) data.append("file", formData.file);
      data.append("author", formData.author);
      data.append("document_type", formData.document_type);
      data.append("issue_date", formData.issue_date);
      data.append("responsible_area", formData.responsible_area);
      data.append("sensitivity_level", formData.sensitivity_level);

      const result = await uploadDocument(data);

      const duplicate = result.is_duplicate ?? false;

      setUploadResult({
        success: !duplicate,
        message: duplicate
          ? "⚠️ Documento duplicado: ya existe en el sistema."
          : "✔️ Documento subido con éxito",
        isDuplicate: duplicate,
      });

      // ---------------------------------------------------
      // ✅ Redirigir al listado solo si NO es duplicado
      // ---------------------------------------------------
      if (!duplicate) {
        setTimeout(() => {
          router.push("/admin/documents");
        }, 1500);
      }
    } catch (err: any) {
      setError(err.message || "Error al subir documento");
    } finally {
      setLoading(false);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] || null;
    setFormData({ ...formData, file });
  }

  /* ======================================
     RENDER
  ====================================== */

  return (
    <div className="projects-container">
      <div className="projects-header">
        <h1 className="projects-title">Subir Documento</h1>

        <button
          className="btn-secondary"
          onClick={() => router.push("/admin/documents")}
        >
          Volver
        </button>
      </div>

      <div className="form-card">
        {/* Resultado */}
        {uploadResult && (
          <div
            className={`upload-result ${
              uploadResult.isDuplicate ? "warning" : "success"
            }`}
          >
            <p>{uploadResult.message}</p>
            {uploadResult.isDuplicate && (
              <p className="upload-result-hint">
                El archivo ya existe registrado en el sistema.
              </p>
            )}
          </div>
        )}

        {/* Error general */}
        {error && <div className="form-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="doc-form-grid">
            {/* PROYECTO */}
            <div className="form-group">
              <label>Proyecto *</label>
              <select
                value={formData.projectId}
                onChange={(e) =>
                  setFormData({ ...formData, projectId: e.target.value })
                }
                disabled={loading}
              >
                <option value="">Selecciona un proyecto</option>
                {Array.isArray(projects) &&
                  projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
              </select>
              {errors.projectId && (
                <span className="form-error-text">{errors.projectId}</span>
              )}
            </div>

            {/* TITULO */}
            <div className="form-group">
              <label>Título *</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                disabled={loading}
              />
              {errors.title && (
                <span className="form-error-text">{errors.title}</span>
              )}
            </div>

            {/* DESCRIPCION */}
            <div className="form-group full-width">
              <label>Descripción</label>
              <textarea
                rows={3}
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                disabled={loading}
              />
            </div>

            {/* ARCHIVO */}
            <div className="form-group full-width">
              <label>Archivo *(PDF/JPG/PNG, máx 10MB)</label>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleFileChange}
                disabled={loading}
              />

              {formData.file && (
                <span className="form-hint">
                  {formData.file.name} —{" "}
                  {(formData.file.size / 1024 / 1024).toFixed(2)}MB
                </span>
              )}

              {errors.file && (
                <span className="form-error-text">{errors.file}</span>
              )}
            </div>

            {/* AUTOR */}
            <div className="form-group">
              <label>Autor *</label>
              <input
                type="text"
                value={formData.author}
                onChange={(e) =>
                  setFormData({ ...formData, author: e.target.value })
                }
                disabled={loading}
              />
              {errors.author && (
                <span className="form-error-text">{errors.author}</span>
              )}
            </div>

            {/* TIPO */}
            <div className="form-group">
              <label>Tipo *</label>
              <input
                type="text"
                placeholder="Ej: Contrato, Factura, Plano"
                value={formData.document_type}
                onChange={(e) =>
                  setFormData({ ...formData, document_type: e.target.value })
                }
                disabled={loading}
              />
              {errors.document_type && (
                <span className="form-error-text">{errors.document_type}</span>
              )}
            </div>

            {/* FECHA */}
            <div className="form-group">
              <label>Fecha emisión *</label>
              <input
                type="date"
                value={formData.issue_date}
                onChange={(e) =>
                  setFormData({ ...formData, issue_date: e.target.value })
                }
                disabled={loading}
              />
              {errors.issue_date && (
                <span className="form-error-text">{errors.issue_date}</span>
              )}
            </div>

            {/* AREA */}
            <div className="form-group">
              <label>Área responsable *</label>
              <input
                type="text"
                value={formData.responsible_area}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    responsible_area: e.target.value,
                  })
                }
                disabled={loading}
              />
              {errors.responsible_area && (
                <span className="form-error-text">
                  {errors.responsible_area}
                </span>
              )}
            </div>

            {/* SENSIBILIDAD */}
            <div className="form-group">
              <label>Nivel de Sensibilidad *</label>
              <select
                value={formData.sensitivity_level}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    sensitivity_level: e.target.value as any,
                  })
                }
                disabled={loading}
              >
                <option value="public">Público</option>
                <option value="internal">Interno</option>
                <option value="confidential">Confidencial</option>
                <option value="restricted">Restringido</option>
              </select>
            </div>
          </div>

          {/* BOTONES */}
          <div className="form-actions">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => router.push("/admin/documents")}
              disabled={loading}
            >
              Cancelar
            </button>

            <button className="btn-primary" type="submit" disabled={loading}>
              {loading ? "Subiendo..." : "Subir Documento"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
