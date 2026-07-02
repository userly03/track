"use client";

import type React from "react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

import {
  createDelivery,
  type CreateDeliveryData,
} from "@/src/lib/api/deliveries";

import { getProjects, type Project } from "@/src/lib/api/projects";
import { getPurchases, type Purchase } from "@/src/lib/api/purchases";

import "@/styles/forms.css";
import "@/styles/deliveries-admin.css";

export default function NewDeliveryPage() {
  const router = useRouter();

  const [projects, setProjects] = useState<Project[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [filteredPurchases, setFilteredPurchases] = useState<Purchase[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [metadataText, setMetadataText] = useState("");

  const [formData, setFormData] = useState<CreateDeliveryData>({
    projectId: 0,
    purchaseId: undefined,
    description: "",
    quantity: 1,
    unit: "",
    date: new Date().toISOString().split("T")[0],
    status: "pending",
    metadata: {},
  });

  /* =====================================================
      CARGA DE DATOS
  ===================================================== */
  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [proj, purch] = await Promise.all([getProjects(), getPurchases()]);

      setProjects(Array.isArray(proj) ? proj : []);
      setPurchases(Array.isArray(purch) ? purch : []);
    } catch (err: any) {
      setError(err.message || "Error al cargar datos");
    }
  }

  /* =====================================================
      FILTRAR COMPRAS SEGÚN PROYECTO
  ===================================================== */
  useEffect(() => {
    const projId = formData.projectId;

    if (!projId) {
      setFilteredPurchases([]);
      setFormData((prev) => ({ ...prev, purchaseId: undefined }));
      return;
    }

    const list = Array.isArray(purchases)
      ? purchases.filter((p) => p.projectId === projId)
      : [];

    setFilteredPurchases(list);

    if (
      formData.purchaseId &&
      !list.some((p) => p.id === formData.purchaseId)
    ) {
      setFormData((prev) => ({ ...prev, purchaseId: undefined }));
    }
  }, [formData.projectId, purchases]);

  /* =====================================================
      VALIDAR METADATA JSON
  ===================================================== */
  function validateMetadata(text: string): boolean {
    if (!text.trim()) return true;
    try {
      JSON.parse(text);
      return true;
    } catch {
      return false;
    }
  }

  /* =====================================================
      HANDLER DEL FORMULARIO
  ===================================================== */
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!formData.projectId) return setError("Selecciona un proyecto");
    if (!formData.description.trim()) return setError("Falta descripción");
    if (formData.quantity <= 0) return setError("Cantidad inválida");
    if (!formData.unit.trim()) return setError("Unidad requerida");

    if (!validateMetadata(metadataText)) {
      return setError("El metadata debe ser un JSON válido");
    }

    try {
      setLoading(true);

      await createDelivery({
        ...formData,
        metadata: metadataText.trim() ? JSON.parse(metadataText) : {},
      });

      router.push("/admin/deliveries");
    } catch (err: any) {
      setError(err.message || "Error al crear entrega");
    } finally {
      setLoading(false);
    }
  }

  /* =====================================================
      RENDER
  ===================================================== */
  const projectList = Array.isArray(projects) ? projects : [];
  const purchaseList = Array.isArray(filteredPurchases)
    ? filteredPurchases
    : [];

  return (
    <div className="deliveries-wrapper">
      {/* HEADER */}
      <div className="deliveries-header">
        <div>
          <h1 className="deliveries-title">Nueva Entrega</h1>
          <p className="deliveries-subtitle">
            Registra una entrega de materiales asociada a un proyecto.
          </p>
        </div>

        <button className="btn-secondary" onClick={() => router.back()}>
          Volver
        </button>
      </div>

      {error && <div className="form-error">{error}</div>}

      {/* FORMULARIO */}
      <form className="form-card" onSubmit={handleSubmit}>
        <div className="delivery-form-grid">
          {/* PROYECTO */}
          <div className="form-group">
            <label className="form-label required">Proyecto</label>
            <select
              className="form-select"
              value={formData.projectId}
              onChange={(e) =>
                setFormData({ ...formData, projectId: Number(e.target.value) })
              }
              required
            >
              <option value={0}>Selecciona un proyecto</option>

              {projectList.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.code} — {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* COMPRA (opcional) */}
          <div className="form-group">
            <label className="form-label">Compra (opcional)</label>
            <select
              className="form-select"
              value={formData.purchaseId || ""}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  purchaseId: e.target.value
                    ? Number(e.target.value)
                    : undefined,
                })
              }
              disabled={!formData.projectId}
            >
              <option value="">Sin compra asociada</option>

              {purchaseList.map((pur) => (
                <option key={pur.id} value={pur.id}>
                  {pur.item_name}
                </option>
              ))}
            </select>
          </div>

          {/* DESCRIPCIÓN */}
          <div className="form-group full-width">
            <label className="form-label required">Descripción</label>
            <input
              type="text"
              className="form-input"
              placeholder="Ej: Entrega de 20 sacos de cemento"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              required
            />
          </div>

          {/* CANTIDAD */}
          <div className="form-group">
            <label className="form-label required">Cantidad</label>
            <input
              type="number"
              className="form-input"
              min={0.01}
              step={0.01}
              value={formData.quantity}
              onChange={(e) =>
                setFormData({ ...formData, quantity: Number(e.target.value) })
              }
              required
            />
          </div>

          {/* UNIDAD */}
          <div className="form-group">
            <label className="form-label required">Unidad</label>
            <input
              type="text"
              className="form-input"
              placeholder="Ej: kg, m3, unidades"
              value={formData.unit}
              onChange={(e) =>
                setFormData({ ...formData, unit: e.target.value })
              }
              required
            />
          </div>

          {/* FECHA */}
          <div className="form-group">
            <label className="form-label required">Fecha</label>
            <input
              type="date"
              className="form-input"
              value={formData.date}
              onChange={(e) =>
                setFormData({ ...formData, date: e.target.value })
              }
              required
            />
          </div>
        </div>

        {/* BOTONES */}
        <div className="form-actions">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => router.back()}
          >
            Cancelar
          </button>

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? "Creando..." : "Crear Entrega"}
          </button>
        </div>
      </form>
    </div>
  );
}
