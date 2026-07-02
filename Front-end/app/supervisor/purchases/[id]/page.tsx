"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";

import { getPurchase, type Purchase } from "@/src/lib/api/purchases";
import { getProject, type Project } from "@/src/lib/api/projects";

import "@/styles/supervisor-purchase-detail.css";

export default function SupervisorPurchaseDetailPage() {
  const router = useRouter();
  const params = useParams();
  const purchaseId = Number(params.id);

  const [purchase, setPurchase] = useState<Purchase | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadData();
  }, [purchaseId]);

  async function loadData() {
    try {
      setLoading(true);

      const purchaseData = await getPurchase(purchaseId);
      setPurchase(purchaseData);

      const projectData = await getProject(purchaseData.projectId);
      setProject(projectData);
    } catch (err: any) {
      setError(err.message || "Error al cargar la compra");
    } finally {
      setLoading(false);
    }
  }

  function formatMoney(value: any) {
    const num = Number(value);
    return isNaN(num) ? "0.00" : num.toFixed(2);
  }

  if (loading)
    return (
      <div className="form-container">
        <div className="table-loading">Cargando compra...</div>
      </div>
    );

  if (error || !purchase)
    return (
      <div className="form-container">
        <div className="table-empty">
          Error: {error || "Compra no encontrada"}
        </div>
      </div>
    );

  const marketAvg = purchase.market_price?.market_avg;
  const marketUpdatedAt = purchase.market_price?.updated_at;

  return (
    <div className="form-container">
      <div className="form-card">
        <h1 className="form-title">
          Compra #{purchase.id} — {purchase.item_name}
        </h1>

        <p className="form-subtitle">
          Proyecto asociado:{" "}
          <strong>
            {project ? `${project.code} — ${project.name}` : "Cargando..."}
          </strong>
        </p>

        {/* GRID PRINCIPAL */}
        <div className="purchase-detail-grid">
          <div className="form-group">
            <label className="form-label">Cantidad</label>
            <div className="form-value">{purchase.quantity}</div>
          </div>

          <div className="form-group">
            <label className="form-label">Unitario</label>
            <div className="form-value">
              ${formatMoney(purchase.unit_price)}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Total</label>
            <div className="form-value purchase-total">
              ${formatMoney(purchase.total_price)}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Mercado</label>
            <div className="form-value">
              {marketAvg != null
                ? `$${formatMoney(marketAvg)}`
                : "Sin datos de mercado"}
            </div>
            {marketUpdatedAt && (
              <div className="form-hint">
                Actualizado: {new Date(marketUpdatedAt).toLocaleDateString()}
              </div>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Proveedor</label>
            <div className="form-value">{purchase.supplier}</div>
          </div>

          <div className="form-group">
            <label className="form-label">Estado</label>
            <div className="form-value">
              <span className={`purchase-status-badge ${purchase.status}`}>
                {purchase.status}
              </span>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Creado</label>
            <div className="form-value">
              {new Date(purchase.created_at).toLocaleString()}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Actualizado</label>
            <div className="form-value">
              {new Date(purchase.updated_at).toLocaleString()}
            </div>
          </div>

          {/* HASHES */}
          <div className="form-group full-width">
            <label className="form-label">Content Hash</label>
            <div className="form-value hash">{purchase.content_hash}</div>
          </div>

          <div className="form-group full-width">
            <label className="form-label">Previous Hash</label>
            <div className="form-value hash">{purchase.previous_hash}</div>
          </div>
        </div>

        {/* -------------------------------- */}
        {/* ACCIÓN: IR A VALIDACIÓN W-of-N */}
        {/* -------------------------------- */}
        <div className="form-actions">
          {purchase.validation_id ? (
            <button
              className="btn-primary"
              onClick={() =>
                router.push(`/supervisor/validation/${purchase.validation_id}`)
              }
            >
              Revisar Validación
            </button>
          ) : (
            <p style={{ fontStyle: "italic", color: "#777" }}>
              Esta compra aún no tiene una validación generada.
            </p>
          )}

          <button className="btn-secondary" onClick={() => router.back()}>
            Volver
          </button>
        </div>
      </div>
    </div>
  );
}
