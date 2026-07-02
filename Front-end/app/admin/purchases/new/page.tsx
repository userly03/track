"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  createPurchase,
  type CreatePurchaseData,
} from "@/src/lib/api/purchases";
import { getProjects, type Project } from "@/src/lib/api/projects";

import "@/styles/forms.css";
import "@/styles/purchases-admin.css";

export default function NewPurchasePage() {
  const router = useRouter();

  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // 🔥 Materiales válidos (coincide con backend)
  const MATERIALS = [
    "cemento",
    "arena",
    "fierro",
    "ladrillo",
    "yeso",
    "pvc",
    "clavos",
  ];

  const [formData, setFormData] = useState<CreatePurchaseData>({
    projectId: 0,
    item_name: "",
    quantity: 1,
    unit_price: 0,
    supplier: "",
    status: "pending",
  });

  /* ===========================
      LOAD PROJECTS
  ============================ */
  useEffect(() => {
    loadProjects();
  }, []);

  async function loadProjects() {
    try {
      const data = await getProjects();
      setProjects(data);
    } catch {
      setError("Error al cargar proyectos");
    }
  }

  /* ===========================
      VALIDACIÓN LOCAL
  ============================ */
  function validateForm(): string | null {
    if (!formData.projectId) return "Debes seleccionar un proyecto.";
    if (!formData.item_name) return "Debes seleccionar un material.";
    if (!MATERIALS.includes(formData.item_name.toLowerCase()))
      return "Material inválido.";

    if (formData.quantity <= 0) return "La cantidad debe ser mayor a 0.";
    if (formData.quantity > 1_000_000)
      return "La cantidad es demasiado grande.";

    if (formData.unit_price <= 0)
      return "El precio unitario debe ser mayor a 0.";
    if (formData.unit_price > 1_000_000)
      return "El precio unitario es demasiado grande.";

    if (!formData.supplier.trim()) return "El proveedor es obligatorio.";

    return null;
  }

  /* ===========================
      SUBMIT
  ============================ */
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const validation = validateForm();
    if (validation) {
      setError(validation);
      return;
    }

    try {
      setLoading(true);
      await createPurchase(formData);
      router.push("/admin/purchases");
    } catch (err: any) {
      setError(err.message || "Error al crear la compra");
    } finally {
      setLoading(false);
    }
  }

  /* ===========================
      UI
  ============================ */
  return (
    <div className="form-container">
      <div className="form-card">
        <h1 className="form-title">Registrar Nueva Compra</h1>
        <p className="form-subtitle">
          Ingrese los datos requeridos para registrar la compra en el sistema.
        </p>

        {error && <div className="form-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          {/* PROYECTO */}
          <div className="form-group">
            <label className="form-label required">Proyecto</label>
            <select
              name="projectId"
              className="form-select"
              value={formData.projectId}
              onChange={(e) =>
                setFormData({ ...formData, projectId: Number(e.target.value) })
              }
            >
              <option value={0}>Selecciona un proyecto</option>
              {Array.isArray(projects) &&
                projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.code} — {p.name}
                  </option>
                ))}
            </select>
          </div>

          {/* MATERIAL */}
          <div className="form-group">
            <label className="form-label required">Material</label>
            <select
              name="item_name"
              className="form-select"
              value={formData.item_name}
              onChange={(e) =>
                setFormData({ ...formData, item_name: e.target.value })
              }
            >
              <option value="">Selecciona un material</option>
              {MATERIALS.map((m) => (
                <option key={m} value={m}>
                  {m.toUpperCase()}
                </option>
              ))}
            </select>
          </div>

          {/* CANTIDAD Y PRECIO */}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label required">Cantidad</label>
              <input
                type="number"
                name="quantity"
                className="form-input"
                inputMode="decimal"
                min={1}
                max={1_000_000}
                placeholder="0"
                value={formData.quantity || ""}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setFormData({
                    ...formData,
                    quantity: val > 0 ? val : 0,
                  });
                }}
              />
            </div>

            <div className="form-group">
              <label className="form-label required">
                Precio Unitario (S/)
              </label>
              <input
                type="number"
                name="unit_price"
                className="form-input"
                inputMode="decimal"
                min={0}
                max={1_000_000}
                placeholder="0.00"
                step="0.01"
                value={formData.unit_price || ""}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setFormData({
                    ...formData,
                    unit_price: val >= 0 ? val : 0,
                  });
                }}
              />
            </div>
          </div>

          {/* PROVEEDOR */}
          <div className="form-group">
            <label className="form-label required">Proveedor</label>
            <input
              type="text"
              name="supplier"
              className="form-input"
              placeholder="Ej: Ferretería Los Andes"
              value={formData.supplier}
              onChange={(e) =>
                setFormData({ ...formData, supplier: e.target.value })
              }
            />
          </div>

          <input type="hidden" name="status" value="pending" />

          {/* ACCIONES */}
          <div className="form-actions">
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? "Guardando..." : "Registrar Compra"}
            </button>

            <button
              type="button"
              className="btn-secondary"
              onClick={() => router.push("/admin/purchases")}
              disabled={loading}
            >
              Volver
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
