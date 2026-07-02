"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import {
  getDeliveries,
  deleteDelivery,
  type Delivery,
} from "@/src/lib/api/deliveries";

import { getProjects, type Project } from "@/src/lib/api/projects";
import { getPurchases, type Purchase } from "@/src/lib/api/purchases";

import "@/styles/deliveries-admin.css";

export default function DeliveriesPage() {
  const router = useRouter();

  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [deleteModal, setDeleteModal] = useState<{
    open: boolean;
    deliveryId: number | null;
  }>({ open: false, deliveryId: null });

  const safe = (v: any): string =>
    v === null || v === undefined ? "" : String(v);

  /* ======================================
     CARGA INICIAL
  ====================================== */
  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);

      const [dData, pData, purData] = await Promise.all([
        getDeliveries(),
        getProjects(),
        getPurchases(),
      ]);

      setDeliveries(Array.isArray(dData) ? dData : []);
      setProjects(Array.isArray(pData) ? pData : []);
      setPurchases(Array.isArray(purData) ? purData : []);
    } catch (err: any) {
      setError(err.message || "Error al cargar entregas");
    } finally {
      setLoading(false);
    }
  }

  /* ======================================
     HELPERS
  ====================================== */
  function getProjectName(id: number) {
    return projects.find((p) => p.id === id)?.name || `Proyecto #${id}`;
  }

  function getPurchaseName(id?: number | null) {
    if (id == null) return "-";
    return purchases.find((p) => p.id === id)?.item_name || `Compra #${id}`;
  }

  /* ======================================
     DELETE HANDLER
  ====================================== */
  async function handleDelete(id: number) {
    try {
      await deleteDelivery(id);
      setDeliveries((prev) => prev.filter((d) => d.id !== id));
      setDeleteModal({ open: false, deliveryId: null });
    } catch (err: any) {
      alert(`Error al eliminar: ${err.message}`);
    }
  }

  /* ======================================
     UI STATES
  ====================================== */
  if (loading) {
    return (
      <div className="deliveries-wrapper">
        <div className="page-loading">Cargando entregas...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="deliveries-wrapper">
        <div className="page-error">{error}</div>
      </div>
    );
  }

  const list = Array.isArray(deliveries) ? deliveries : [];

  return (
    <div className="deliveries-wrapper">
      {/* =======================
          HEADER
      ======================== */}
      <div className="deliveries-header">
        <div>
          <h1 className="deliveries-title">Gestión de Entregas</h1>
          <p className="deliveries-subtitle">
            Control de materiales entregados y trazabilidad.
          </p>
        </div>

        <button
          className="btn-primary"
          onClick={() => router.push("/admin/deliveries/new")}
        >
          + Nueva Entrega
        </button>
      </div>

      {/* =======================
          TABLE
      ======================== */}
      <div className="table-wrapper">
        <table className="data-table">
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
            {list.length === 0 ? (
              <tr>
                <td colSpan={8} className="table-empty">
                  No hay entregas registradas
                </td>
              </tr>
            ) : (
              list.map((d) => (
                <tr key={d.id}>
                  <td>{safe(d.description)}</td>

                  <td>{getProjectName(d.projectId)}</td>

                  <td>{getPurchaseName(d.purchaseId)}</td>

                  <td>{safe(d.quantity)}</td>

                  <td>{safe(d.unit)}</td>

                  <td>
                    {d.date
                      ? new Date(d.date).toLocaleDateString("es-PE")
                      : "-"}
                  </td>

                  <td>
                    <span className={`delivery-status ${d.status}`}>
                      {d.status}
                    </span>
                  </td>

                  <td>
                    <div className="table-actions">
                      <button
                        className="btn-secondary small"
                        onClick={() => router.push(`/admin/deliveries/${d.id}`)}
                      >
                        Ver / Editar
                      </button>

                      <button
                        className="btn-danger small"
                        onClick={() =>
                          setDeleteModal({ open: true, deliveryId: d.id })
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

      {/* =======================
          MODAL CONFIRMACIÓN
      ======================== */}
      {deleteModal.open && (
        <div
          className="modal-overlay"
          onClick={() => setDeleteModal({ open: false, deliveryId: null })}
        >
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">Confirmar Eliminación</h2>
            <p className="modal-text">
              ¿Deseas eliminar esta entrega? Esta acción no se puede deshacer.
            </p>

            <div className="modal-actions">
              <button
                className="btn-secondary"
                onClick={() =>
                  setDeleteModal({ open: false, deliveryId: null })
                }
              >
                Cancelar
              </button>

              <button
                className="btn-danger"
                onClick={() =>
                  deleteModal.deliveryId && handleDelete(deleteModal.deliveryId)
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
