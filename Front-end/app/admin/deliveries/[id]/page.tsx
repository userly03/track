"use client";

import type React from "react";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";

import {
  getDelivery,
  updateDelivery,
  deleteDelivery,
  type UpdateDeliveryData,
} from "@/src/lib/api/deliveries";

import { getProjects, type Project } from "@/src/lib/api/projects";
import { getPurchases, type Purchase } from "@/src/lib/api/purchases";

import "@/styles/forms.css";
import "@/styles/deliveries-admin.css";
import "@/styles/modal.css";

export default function EditDeliveryPage() {
  const router = useRouter();
  const params = useParams();
  const deliveryId = Number(params.id);

  const [projects, setProjects] = useState<Project[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [filteredPurchases, setFilteredPurchases] = useState<Purchase[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [deleteModal, setDeleteModal] = useState(false);

  const [metadataText, setMetadataText] = useState("");

  const [hashes, setHashes] = useState({
    content_hash: "",
    previous_hash: "",
  });

  const [formData, setFormData] = useState<UpdateDeliveryData>({
    projectId: 0,
    purchaseId: undefined,
    description: "",
    quantity: 1,
    unit: "",
    date: "",
    status: "pending",
    metadata: {},
  });

  // -----------------------------------------
  // LOAD INITIAL DATA
  // -----------------------------------------
  useEffect(() => {
    loadData();
  }, [deliveryId]);

  async function loadData() {
    try {
      setLoading(true);

      const [d, proj, purch] = await Promise.all([
        getDelivery(deliveryId),
        getProjects(),
        getPurchases(),
      ]);

      setProjects(Array.isArray(proj) ? proj : []);
      setPurchases(Array.isArray(purch) ? purch : []);

      setFormData({
        projectId: d.projectId,
        purchaseId: d.purchaseId ?? undefined,
        description: d.description,
        quantity: d.quantity,
        unit: d.unit,
        date: d.date.split("T")[0],
        status: d.status,
        metadata: d.metadata,
      });

      setMetadataText(
        Object.keys(d.metadata || {}).length
          ? JSON.stringify(d.metadata, null, 2)
          : ""
      );

      setHashes({
        content_hash: d.content_hash,
        previous_hash: d.previous_hash,
      });
    } catch (err: any) {
      setError(err.message || "Error al cargar entrega");
    } finally {
      setLoading(false);
    }
  }

  // -----------------------------------------
  // FILTER PURCHASES BY PROJECT
  // -----------------------------------------
  useEffect(() => {
    if (!formData.projectId) {
      setFilteredPurchases([]);
      setFormData((prev) => ({ ...prev, purchaseId: undefined }));
      return;
    }

    const filtered = Array.isArray(purchases)
      ? purchases.filter((p) => p.projectId === formData.projectId)
      : [];

    setFilteredPurchases(filtered);

    if (
      formData.purchaseId &&
      !filtered.some((p) => p.id === formData.purchaseId)
    ) {
      setFormData((prev) => ({ ...prev, purchaseId: undefined }));
    }
  }, [formData.projectId, purchases]);

  // -----------------------------------------
  // JSON VALIDATION
  // -----------------------------------------
  function validateMetadata(text: string) {
    if (!text.trim()) return true;
    try {
      JSON.parse(text);
      return true;
    } catch {
      return false;
    }
  }

  // -----------------------------------------
  // SAVE CHANGES
  // -----------------------------------------
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!formData.projectId) return setError("Debes seleccionar un proyecto");
    if (!formData.description?.trim()) return setError("Falta descripción");
    if ((formData.quantity ?? 0) <= 0) return setError("Cantidad inválida");
    if (!formData.unit?.trim()) return setError("Unidad requerida");

    if (!validateMetadata(metadataText)) {
      return setError("El metadata debe ser un JSON válido");
    }

    try {
      setSaving(true);

      await updateDelivery(deliveryId, {
        ...formData,
        metadata: metadataText.trim() ? JSON.parse(metadataText) : {},
      });

      router.push("/admin/deliveries");
    } catch (err: any) {
      setError(err.message || "Error al actualizar entrega");
    } finally {
      setSaving(false);
    }
  }

  // -----------------------------------------
  // DELETE
  // -----------------------------------------
  async function confirmDelete() {
    try {
      await deleteDelivery(deliveryId);
      router.push("/admin/deliveries");
    } catch (err: any) {
      alert(`Error al eliminar: ${err.message}`);
    }
  }

  // -----------------------------------------
  // LOADING OR ERROR SCREEN
  // -----------------------------------------
  if (loading) {
    return <div className="page-loading">Cargando entrega...</div>;
  }

  if (error && !formData.projectId) {
    return <div className="page-error">Error: {error}</div>;
  }

  // -----------------------------------------
  // RENDER PRINCIPAL
  // -----------------------------------------
  return (
    <div className="deliveries-wrapper">
      {/* HEADER */}
      <div className="deliveries-header">
        <div>
          <h1 className="deliveries-title">Editar Entrega #{deliveryId}</h1>

          {/* DESCRIPCIÓN + CANTIDAD */}
          {!!formData.description && (
            <p
              className="deliveries-subtitle"
              style={{ fontSize: "15px", marginTop: "4px" }}
            >
              {formData.description
                ? `Descripción: ${formData.description}`
                : "Sin descripción"}
              {" — "}
              Cantidad: {formData.quantity} {formData.unit}
            </p>
          )}

          <p className="deliveries-subtitle">
            Modifica la información registrada de la entrega.
          </p>
        </div>

        <div className="header-actions">
          <button className="btn-danger" onClick={() => setDeleteModal(true)}>
            Eliminar
          </button>

          <button className="btn-secondary" onClick={() => router.back()}>
            Volver
          </button>
        </div>
      </div>

      {/* HASHES */}
      <div className="delivery-hashes">
        <div className="hash-item">
          <span className="hash-label">Content Hash:</span>
          <span className="hash-value">{hashes.content_hash}</span>
        </div>

        <div className="hash-item">
          <span className="hash-label">Previous Hash:</span>
          <span className="hash-value">{hashes.previous_hash}</span>
        </div>
      </div>

      {error && <div className="form-error">{error}</div>}

      {/* FORM */}
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

          {/* COMPRA */}
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
              {Array.isArray(filteredPurchases) &&
                filteredPurchases.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.item_name}
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
              value={formData.description}
              placeholder="Ej: Entrega de 20 sacos..."
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
              value={formData.quantity}
              min="0.01"
              step="0.01"
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
              placeholder="kg, unidades, m³"
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

        <div className="form-actions">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => router.back()}
            disabled={saving}
          >
            Cancelar
          </button>

          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? "Guardando..." : "Guardar Cambios"}
          </button>
        </div>
      </form>

      {/* MODAL ELIMINAR */}
      {deleteModal && (
        <div className="modal-overlay" onClick={() => setDeleteModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">Confirmar eliminación</h2>

            <p className="modal-text">
              ¿Estás seguro de que deseas eliminar esta entrega? Esta acción no
              se puede deshacer.
            </p>

            <div className="modal-actions">
              <button
                className="btn-secondary"
                onClick={() => setDeleteModal(false)}
              >
                Cancelar
              </button>

              <button className="btn-danger" onClick={confirmDelete}>
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
