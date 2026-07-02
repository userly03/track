"use client";

import { useState } from "react";
import { getMarketPrice, type MarketPrice } from "@/src/lib/api/market";

import "@/styles/market-admin.css"; // ⬅️ Nuevo CSS único del módulo
import "@/styles/forms.css";
import "@/styles/table.css";

export default function MarketPage() {
  const [material, setMaterial] = useState("");
  const [result, setResult] = useState<MarketPrice | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSearch() {
    if (!material.trim()) {
      setError("Por favor ingrese un material para consultar");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setResult(null);

      const data = await getMarketPrice(material.trim());
      setResult(data);
    } catch (err: any) {
      setError(err.message || "Error al consultar precio de mercado");
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") handleSearch();
  }

  function safeNumber(num: any): string {
    const n = Number(num);
    return isNaN(n) ? "Sin datos" : `$${n.toFixed(2)}`;
  }

  function formatUpdatedAt(dateString: string | null) {
    if (!dateString) return "Fecha desconocida";

    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "Fecha inválida";

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
      return `Actualizado hace ${diffDays} día${diffDays > 1 ? "s" : ""}`;
    } else if (diffHours > 0) {
      return `Actualizado hace ${diffHours} hora${diffHours > 1 ? "s" : ""}`;
    } else {
      return "Actualizado recientemente";
    }
  }

  return (
    <div className="market-container">
      {/* HEADER */}
      <div className="market-header">
        <h1 className="market-title">Consulta de Precios de Mercado</h1>
        <p className="market-subtitle">
          Obtén precios promedio, mínimos y máximos para materiales de
          construcción.
        </p>
      </div>

      {/* BUSCADOR */}
      <div className="market-search-card">
        <div className="form-group">
          <label className="form-label required">Material</label>
          <input
            type="text"
            className="form-input"
            placeholder="Ej: cemento, arena, acero, ladrillo..."
            value={material}
            onChange={(e) => setMaterial(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <p className="form-hint">
            Ingrese un material para consultar su precio de mercado.
          </p>
        </div>

        <button
          className="btn-primary"
          onClick={handleSearch}
          disabled={loading}
        >
          {loading ? "Buscando..." : "Buscar Precio"}
        </button>

        {error && <div className="market-error">{error}</div>}
      </div>

      {/* LOADING */}
      {loading && (
        <div className="market-loader">
          <div className="spinner"></div>
          <p>Consultando fuentes de mercado...</p>
        </div>
      )}

      {/* RESULTADOS */}
      {result && !loading && (
        <div className="market-result-card">
          <div className="market-result-header">
            <h2 className="market-result-title">
              Resultados para: {result.query}
            </h2>
            <span className="market-updated-badge">
              {formatUpdatedAt(result.updated_at)}
            </span>
          </div>

          {/* SIN DATOS */}
          {result.market_avg == null &&
          result.market_min == null &&
          result.market_max == null ? (
            <div className="market-no-data">
              <p>⚠️ No se encontraron datos de mercado para este material.</p>
              <p className="market-no-data-hint">
                Intente con otro nombre o verifique disponibilidad.
              </p>
            </div>
          ) : (
            <>
              {/* TARJETAS DE PRECIOS */}
              <div className="market-prices-grid">
                <div className="market-price-card primary">
                  <div className="market-price-label">Precio Promedio</div>
                  <div className="market-price-value">
                    {safeNumber(result.market_avg)}
                  </div>
                  <div className="market-price-hint">
                    Referencia sugerida para compras
                  </div>
                </div>

                <div className="market-price-card success">
                  <div className="market-price-label">Precio Mínimo</div>
                  <div className="market-price-value">
                    {safeNumber(result.market_min)}
                  </div>
                  <div className="market-price-hint">
                    Mejor oferta disponible
                  </div>
                </div>

                <div className="market-price-card warning">
                  <div className="market-price-label">Precio Máximo</div>
                  <div className="market-price-value">
                    {safeNumber(result.market_max)}
                  </div>
                  <div className="market-price-hint">
                    Precio más alto encontrado
                  </div>
                </div>
              </div>

              {/* FUENTES */}
              {result.sources?.length > 0 && (
                <div className="market-sources-section">
                  <h3 className="market-sources-title">
                    Fuentes Consultadas ({result.sources.length})
                  </h3>

                  <div className="market-sources-list">
                    {result.sources.map((source, i) => (
                      <span key={i} className="market-source-badge">
                        {source}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* ACCIONES */}
              <div className="market-actions">
                <button
                  className="btn-secondary"
                  onClick={() =>
                    navigator.clipboard.writeText(
                      String(result.market_avg ?? "")
                    )
                  }
                >
                  📋 Copiar Precio Promedio
                </button>

                <button
                  className="btn-primary"
                  onClick={() =>
                    (window.location.href = "/admin/purchases/new")
                  }
                >
                  ➕ Crear Compra con este Precio
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* ESTADO VACÍO */}
      {!result && !loading && !error && (
        <div className="market-empty">
          <div className="market-empty-icon">📊</div>
          <p className="market-empty-text">
            Ingrese un material para consultar su precio de mercado
          </p>
          <p className="market-empty-hint">
            Ejemplos: cemento, arena, acero, ladrillo, grava, tubería…
          </p>
        </div>
      )}
    </div>
  );
}
