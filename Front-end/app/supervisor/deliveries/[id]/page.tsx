"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { getDelivery, type Delivery } from "@/src/lib/api/deliveries";
import { getProjects, type Project } from "@/src/lib/api/projects";
import { getPurchases, type Purchase } from "@/src/lib/api/purchases";

import "@/styles/supervisor-delivery-detail.css";

export default function SupervisorDeliveryDetailPage() {
  const router = useRouter();
  const params = useParams();
  const deliveryId = Number(params.id);

  const [delivery, setDelivery] = useState<Delivery | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [purchase, setPurchase] = useState<Purchase | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadData();
  }, [deliveryId]);

  async function loadData() {
    try {
      setLoading(true);
      const deliveryData = await getDelivery(deliveryId);
      setDelivery(deliveryData);

      const [pData, pcData] = await Promise.all([
        getProjects(),
        getPurchases(),
      ]);

      setProject(pData.find((p) => p.id === deliveryData.projectId) || null);

      if (deliveryData.purchaseId) {
        setPurchase(
          pcData.find((p) => p.id === deliveryData.purchaseId) || null
        );
      }
    } catch (err: any) {
      setError(err.message || "Error al cargar entrega");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="delivery-detail-page">
        <div className="loading-box">Cargando entrega...</div>
      </div>
    );
  }

  if (error || !delivery) {
    return (
      <div className="delivery-detail-page">
        <div className="error-box">
          Error: {error || "Entrega no encontrada"}
        </div>
      </div>
    );
  }

  return (
    <div className="delivery-detail-page">
      {/* ----------------------------------------------- */}
      {/* HEADER */}
      {/* ----------------------------------------------- */}
      <div className="page-header">
        <h1 className="page-title">Entrega #{deliveryId}</h1>
        <button className="btn-back" onClick={() => router.back()}>
          ← Volver
        </button>
      </div>

      {/* ----------------------------------------------- */}
      {/* HASHES CARD */}
      {/* ----------------------------------------------- */}
      <div className="card card-hashes">
        <h2 className="card-title">Información Blockchain</h2>

        <div className="hash-grid">
          <div className="hash-block">
            <span className="hash-label">Content Hash</span>
            <span className="hash-value">{delivery.content_hash}</span>
          </div>

          <div className="hash-block">
            <span className="hash-label">Previous Hash</span>
            <span className="hash-value">{delivery.previous_hash}</span>
          </div>
        </div>
      </div>

      {/* ----------------------------------------------- */}
      {/* MAIN DETAIL CARD */}
      {/* ----------------------------------------------- */}
      <div className="card">
        <h2 className="card-title">Detalles de la Entrega</h2>

        <div className="detail-grid">
          <div className="detail-item">
            <label>Proyecto</label>
            <p>{project?.name || `Proyecto #${delivery.projectId}`}</p>
          </div>

          <div className="detail-item">
            <label>Compra</label>
            <p>
              {purchase?.item_name || delivery.purchaseId
                ? `Compra #${delivery.purchaseId}`
                : "-"}
            </p>
          </div>

          <div className="detail-item full">
            <label>Descripción</label>
            <p>{delivery.description}</p>
          </div>

          <div className="detail-item">
            <label>Cantidad</label>
            <p>{delivery.quantity}</p>
          </div>

          <div className="detail-item">
            <label>Unidad</label>
            <p>{delivery.unit}</p>
          </div>

          <div className="detail-item">
            <label>Fecha</label>
            <p>{new Date(delivery.date).toLocaleDateString()}</p>
          </div>

          <div className="detail-item">
            <label>Estado</label>
            <span className={`status-badge status-${delivery.status}`}>
              {delivery.status}
            </span>
          </div>

          <div className="detail-item full">
            <label>Metadata</label>
            <pre className="json-box">
              {JSON.stringify(delivery.metadata, null, 2)}
            </pre>
          </div>

          <div className="detail-item">
            <label>Creado</label>
            <p>{new Date(delivery.created_at).toLocaleString()}</p>
          </div>

          <div className="detail-item">
            <label>Actualizado</label>
            <p>{new Date(delivery.updated_at).toLocaleString()}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
