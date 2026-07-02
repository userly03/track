"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";

import {
  getPurchase,
  updatePurchase,
  type Purchase,
  type UpdatePurchaseData,
} from "@/src/lib/api/purchases";
import { getProjects, type Project } from "@/src/lib/api/projects";

import "@/styles/forms.css";
import "@/styles/purchases-admin.css";

export default function PurchaseDetailPage() {
  const router = useRouter();
  const params = useParams();
  const purchaseId = Number(params.id);

  const MATERIALS = [
    "cemento",
    "arena",
    "fierro",
    "ladrillo",
    "yeso",
    "pvc",
    "clavos",
  ];

  const [purchase, setPurchase] = useState<Purchase | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [formData, setFormData] = useState<UpdatePurchaseData>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const safe = (v: any) => (isNaN(Number(v)) ? 0 : Number(v));

  // ============================================
  // LOAD DATA
  // ============================================
  useEffect(() => {
    loadData();
  }, [purchaseId]);

  async function loadData() {
    try {
      setLoading(true);

      const [purchaseData, projectsData] = await Promise.all([
        getPurchase(purchaseId),
        getProjects(),
      ]);

      setPurchase(purchaseData);
      setProjects(Array.isArray(projectsData) ? projectsData : []);

      // PROTEGER datos vacíos
      setFormData({
        projectId: purchaseData.projectId ?? 0,
        item_name: purchaseData.item_name ?? "",
        quantity: purchaseData.quantity ?? 0,
        unit_price: purchaseData.unit_price ?? 0,
        supplier: purchaseData.supplier ?? "",
        status: purchaseData.status ?? "pending",
      });
    } catch (err: any) {
      setError(err.message || "Error al cargar compra");
    } finally {
      setLoading(false);
    }
  }

  // ============================================
  // INPUT HANDLER
  // ============================================
  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]:
        name === "projectId" || name === "quantity" || name === "unit_price"
          ? Number(value)
          : value,
    }));
  }

  // ============================================
  // VALIDATION
  // ============================================
  function validateForm(): string | null {
    if (!formData.projectId) return "Debes seleccionar un proyecto.";
    if (!formData.item_name) return "Debes seleccionar un material.";
    if (!MATERIALS.includes(formData.item_name.toLowerCase()))
      return "Material inválido.";
    if (!formData.supplier?.trim()) return "El proveedor es obligatorio.";

    if (!formData.quantity || formData.quantity <= 0)
      return "La cantidad debe ser mayor a 0.";

    if (!formData.unit_price || formData.unit_price <= 0)
      return "El precio unitario debe ser mayor a 0.";

    return null;
  }

  // ============================================
  // SUBMIT
  // ============================================
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const validation = validateForm();
    if (validation) return setError(validation);

    try {
      setSaving(true);
      await updatePurchase(purchaseId, formData);
      router.push("/admin/purchases");
    } catch (err: any) {
      setError(err.message || "Error al actualizar compra");
    } finally {
      setSaving(false);
    }
  }

  // ============================================
  // UI STATES
  // ============================================
  if (loading) {
    return (
      <div className="form-container">
        <div className="table-loading">Cargando compra…</div>
      </div>
    );
  }

  if (!purchase) {
    return (
      <div className="form-container">
        <div className="table-empty">{error}</div>
      </div>
    );
  }

  // ============================================
  // VIEW
  // ============================================
  return (
    <div className="form-container">
      <div className="form-card">
        {/* TÍTULO */}
        <h1 className="form-title">
          {purchase.item_name
            ? `${purchase.item_name.toUpperCase()} — Compra #${purchase.id}`
            : `Compra #${purchase.id}`}
        </h1>

        <p className="form-subtitle">Actualiza los campos necesarios.</p>

        {error && <div className="form-error">{error}</div>}

        {/* INFO SISTEMA */}
        <div className="system-info-card">
          <h3 className="system-info-title">Información del Sistema</h3>

          <div className="system-info-grid">
            <div className="system-info-box">
              <span className="info-label">Precio Total</span>
              <span className="info-value">
                S/ {safe(purchase.total_price).toFixed(2)}
              </span>
            </div>

            <div className="system-info-box">
              <span className="info-label">Precio Mercado</span>
              <span className="info-value">
                S/ {safe(purchase.market_price).toFixed(2)}
              </span>
            </div>

            <div className="system-info-box">
              <span className="info-label">Content Hash</span>
              <span className="info-hash">{purchase.content_hash}</span>
            </div>

            <div className="system-info-box">
              <span className="info-label">Hash Anterior</span>
              <span className="info-hash">{purchase.previous_hash}</span>
            </div>
          </div>
        </div>

        {/* FORMULARIO */}
        <form onSubmit={handleSubmit}>
          {/* Proyecto */}
          <div className="form-group">
            <label className="form-label required">Proyecto</label>
            <select
              name="projectId"
              className="form-select"
              value={formData.projectId ?? 0}
              onChange={handleChange}
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

          {/* Material */}
          <div className="form-group">
            <label className="form-label required">Material</label>
            <select
              name="item_name"
              className="form-select"
              value={formData.item_name}
              onChange={handleChange}
            >
              {MATERIALS.map((m) => (
                <option key={m} value={m}>
                  {m.toUpperCase()}
                </option>
              ))}
            </select>
          </div>

          {/* Cantidad + Precio */}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label required">Cantidad</label>
              <input
                type="number"
                name="quantity"
                className="form-input"
                min={1}
                placeholder="0"
                value={formData.quantity ?? ""}
                onChange={handleChange}
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
                min={0}
                step="0.01"
                placeholder="0.00"
                value={formData.unit_price ?? ""}
                onChange={handleChange}
              />
            </div>
          </div>

          {/* Proveedor */}
          <div className="form-group">
            <label className="form-label required">Proveedor</label>
            <input
              type="text"
              name="supplier"
              className="form-input"
              value={formData.supplier}
              onChange={handleChange}
            />
          </div>

          {/* BOTONES */}
          <div className="form-actions">
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? "Guardando..." : "Guardar Cambios"}
            </button>

            <button
              type="button"
              className="btn-secondary"
              onClick={() => router.push("/admin/purchases")}
            >
              Volver
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
