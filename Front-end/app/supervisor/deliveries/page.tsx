"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getDeliveries, type Delivery } from "@/src/lib/api/deliveries";
import { getProjects, type Project } from "@/src/lib/api/projects";
import { getPurchases, type Purchase } from "@/src/lib/api/purchases";

import "@/styles/supervisor-deliveries.css";

export default function SupervisorDeliveriesPage() {
  const router = useRouter();

  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);

      const [d, p, pc] = await Promise.all([
        getDeliveries(),
        getProjects(),
        getPurchases(),
      ]);

      setDeliveries(d);
      setProjects(p);
      setPurchases(pc);
    } catch (err: any) {
      setError(err.message || "Error al cargar entregas");
    } finally {
      setLoading(false);
    }
  }

  function getProjectName(id: number) {
    return projects.find((p) => p.id === id)?.name || `Proyecto #${id}`;
  }

  // --- PARCHE CORRECTO: acepta number | null | undefined ---
  function getPurchaseName(id: number | null | undefined) {
    if (!id) return "-";
    return purchases.find((p) => p.id === id)?.item_name || `Compra #${id}`;
  }

  if (loading) {
    return (
      <div className="deliveries-page">
        <div className="loading-box">Cargando entregas...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="deliveries-page">
        <div className="error-box">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="deliveries-page">
      <div className="page-header">
        <h1 className="page-title">Entregas</h1>
      </div>

      <div className="table-card">
        <table className="deliveries-table">
          <thead>
            <tr>
              <th>Descripción</th>
              <th>Proyecto</th>
              <th>Compra</th>
              <th>Cantidad</th>
              <th>Unidad</th>
              <th>Fecha</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>

          <tbody>
            {deliveries.length === 0 ? (
              <tr>
                <td colSpan={8} className="empty-message">
                  No hay entregas registradas
                </td>
              </tr>
            ) : (
              deliveries.map((delivery) => (
                <tr key={delivery.id}>
                  <td>{delivery.description}</td>
                  <td>{getProjectName(delivery.projectId)}</td>
                  <td>{getPurchaseName(delivery.purchaseId)}</td>
                  <td>{delivery.quantity}</td>
                  <td>{delivery.unit}</td>
                  <td>{new Date(delivery.date).toLocaleDateString()}</td>
                  <td>
                    <span className={`status-badge status-${delivery.status}`}>
                      {delivery.status}
                    </span>
                  </td>
                  <td>
                    <button
                      className="btn-view"
                      onClick={() =>
                        router.push(`/supervisor/deliveries/${delivery.id}`)
                      }
                    >
                      Ver detalle
                    </button>
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
