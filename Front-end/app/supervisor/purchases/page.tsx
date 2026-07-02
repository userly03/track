"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { getPurchases, type Purchase } from "@/src/lib/api/purchases";

import "@/styles/table.css";
import "@/styles/supervisor-purchases.css";

export default function SupervisorPurchasesPage() {
  const router = useRouter();

  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [filteredPurchases, setFilteredPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  /* ================================
        LOAD DATA
  ================================== */
  useEffect(() => {
    loadPurchases();
  }, []);

  async function loadPurchases() {
    try {
      setLoading(true);
      const data = await getPurchases();
      setPurchases(data);
      setFilteredPurchases(data);
    } catch (err: any) {
      setError(err.message || "Error al cargar compras");
    } finally {
      setLoading(false);
    }
  }

  /* ================================
        FILTERING
  ================================== */
  useEffect(() => {
    let result = purchases;

    if (searchTerm.trim()) {
      result = result.filter((p) =>
        p.item_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== "all") {
      result = result.filter((p) => p.status === statusFilter);
    }

    setFilteredPurchases(result);
  }, [searchTerm, statusFilter, purchases]);

  /* ================================
        STATES
  ================================== */
  if (loading)
    return (
      <div className="purchases-container">
        <div className="table-loading">Cargando compras...</div>
      </div>
    );

  if (error)
    return (
      <div className="purchases-container">
        <div className="table-error">Error: {error}</div>
      </div>
    );

  /* ================================
        PAGE UI
  ================================== */
  return (
    <div className="purchases-container">
      {/* HEADER */}
      <div className="purchases-header">
        <h1 className="purchases-title">Compras Registradas</h1>
        <p className="purchases-subtitle">
          Listado de compras visibles para supervisión.
        </p>
      </div>

      {/* FILTERS */}
      <div className="purchases-filters">
        <input
          type="text"
          className="search-input"
          placeholder="Buscar ítem..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />

        <select
          className="filter-select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">Todos</option>
          <option value="pending">Pendiente</option>
          <option value="approved">Aprobado</option>
          <option value="observed">Observado</option>
        </select>
      </div>

      {/* TABLE */}
      <div className="table-container">
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Ítem</th>
                <th>Cantidad</th>
                <th>Unitario</th>
                <th>Total</th>
                <th>Proveedor</th>
                <th>Estado</th>
                <th>Mercado</th>
                <th>Fecha</th>
                <th>Acción</th>
              </tr>
            </thead>

            <tbody>
              {filteredPurchases.length === 0 ? (
                <tr>
                  <td colSpan={9} className="table-empty">
                    No se encontraron resultados.
                  </td>
                </tr>
              ) : (
                filteredPurchases.map((purchase) => (
                  <tr key={purchase.id}>
                    <td className="col-strong">{purchase.item_name}</td>
                    <td>{purchase.quantity}</td>
                    <td>${Number(purchase.unit_price).toFixed(2)}</td>

                    <td className="col-total">
                      ${Number(purchase.total_price).toFixed(2)}
                    </td>

                    <td>{purchase.supplier}</td>

                    <td>
                      <span className={`status-badge ${purchase.status}`}>
                        {purchase.status}
                      </span>
                    </td>

                    <td>
                      {purchase.market_price?.market_avg != null
                        ? `$${Number(purchase.market_price.market_avg).toFixed(
                            2
                          )}`
                        : "Sin datos"}
                    </td>

                    <td>
                      {new Date(purchase.created_at).toLocaleDateString()}
                    </td>

                    <td>
                      <button
                        className="btn-view"
                        onClick={() =>
                          router.push(`/supervisor/purchases/${purchase.id}`)
                        }
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
    </div>
  );
}
