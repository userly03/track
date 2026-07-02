"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getPurchases, type Purchase } from "@/src/lib/api/purchases";

import "@/styles/table.css";
import "@/styles/purchases-admin.css";

export default function PurchasesPage() {
  const router = useRouter();

  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [filtered, setFiltered] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const safe = (v: any): number => (isNaN(Number(v)) ? 0 : Number(v));

  // ==============================
  // CARGA DE DATOS
  // ==============================
  useEffect(() => {
    loadPurchases();
  }, []);

  async function loadPurchases() {
    try {
      setLoading(true);
      const data = await getPurchases();

      const list = Array.isArray(data) ? data : [];

      setPurchases(list);
      setFiltered(list);
    } catch (err: any) {
      setError(err.message || "Error al cargar compras");
    } finally {
      setLoading(false);
    }
  }

  // ==============================
  // FILTRADO
  // ==============================
  useEffect(() => {
    let list = Array.isArray(purchases) ? purchases : [];

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter((p) => p.item_name.toLowerCase().includes(q));
    }

    if (statusFilter !== "all") {
      list = list.filter((p) => p.status === statusFilter);
    }

    setFiltered(list);
  }, [searchTerm, statusFilter, purchases]);

  // ==============================
  // UI STATES
  // ==============================
  if (loading) return <div className="page-loading">Cargando compras…</div>;
  if (error) return <div className="page-error">Error: {error}</div>;

  const finalList = Array.isArray(filtered) ? filtered : [];

  return (
    <div className="purchases-wrapper">
      {/* HEADER */}
      <div className="purchases-header">
        <div>
          <h1 className="purchases-title">Gestión de Compras</h1>
          <p className="purchases-subtitle">
            Control de ítems solicitados, costos, proveedores y validaciones.
          </p>
        </div>

        <button
          className="btn-primary"
          onClick={() => router.push("/admin/purchases/new")}
        >
          + Nueva Compra
        </button>
      </div>

      {/* FILTROS */}
      <div className="purchases-filters">
        <input
          type="text"
          className="filter-input"
          placeholder="Buscar ítem…"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />

        <select
          className="filter-select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">Todos los estados</option>
          <option value="pending">Pendiente</option>
          <option value="approved">Aprobado</option>
          <option value="observed">Observado</option>
        </select>
      </div>

      {/* TABLA */}
      <div className="table-wrapper">
        <table className="dashboard-table">
          <thead>
            <tr>
              <th>Ítem</th>
              <th>Cantidad</th>
              <th>PU</th>
              <th>Total</th>
              <th>Proveedor</th>
              <th>Estado</th>
              <th>Mercado</th>
              <th>Fecha</th>
              <th></th>
            </tr>
          </thead>

          <tbody>
            {finalList.length === 0 ? (
              <tr>
                <td colSpan={9} className="table-empty">
                  No hay compras registradas.
                </td>
              </tr>
            ) : (
              finalList.map((p) => (
                <tr key={p.id}>
                  <td>{p.item_name}</td>
                  <td>{safe(p.quantity)}</td>
                  <td>S/ {safe(p.unit_price).toFixed(2)}</td>
                  <td className="purchase-total">
                    S/ {safe(p.total_price).toFixed(2)}
                  </td>
                  <td>{p.supplier}</td>

                  <td>
                    <span className={`purchase-status ${p.status}`}>
                      {p.status}
                    </span>
                  </td>

                  <td>S/ {safe(p.market_price).toFixed(2)}</td>

                  <td>{new Date(p.created_at).toLocaleDateString("es-PE")}</td>

                  <td>
                    <button
                      className="btn-secondary small"
                      onClick={() => router.push(`/admin/purchases/${p.id}`)}
                    >
                      Ver
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
