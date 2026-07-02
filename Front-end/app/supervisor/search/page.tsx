"use client";

import { useState, useEffect, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  globalSearch,
  type SearchResult,
  type SearchFilters,
} from "@/src/lib/api/search";

import "@/styles/supervisor-search.css";

export default function SupervisorSearchPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState<SearchFilters>({});
  const [showFilters, setShowFilters] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalItems, setTotalItems] = useState(0);

  useEffect(() => {
    const q = searchParams.get("q");
    if (q) {
      setQuery(q);
      performSearch(q, 1, filters);
    }
  }, [searchParams]);

  async function performSearch(q: string, page: number, f: SearchFilters) {
    if (!q.trim()) {
      setError("Ingrese un término de búsqueda");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await globalSearch({
        q,
        page,
        filters: f,
      });

      setResults(response.results);
      setCurrentPage(response.pagination.page);
      setTotalPages(response.pagination.total_pages);
      setTotalItems(response.pagination.total_items);
    } catch (err: any) {
      setError(err.message || "Error en la búsqueda");
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  function handleSearch(e: FormEvent) {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/supervisor/search?q=${encodeURIComponent(query)}`);
      performSearch(query, 1, filters);
    }
  }

  function handleFilterChange(key: keyof SearchFilters, value: any) {
    const updated = { ...filters };
    if (!value) delete updated[key];
    else updated[key] = value;
    setFilters(updated);
  }

  function applyFilters() {
    performSearch(query, 1, filters);
  }

  function clearFilters() {
    setFilters({});
    performSearch(query, 1, {});
  }

  function getResultUrl(result: SearchResult): string {
    const map: Record<string, string> = {
      project: "/supervisor/projects",
      purchase: "/supervisor/purchases",
      delivery: "/supervisor/deliveries",
      progress_report: "/supervisor/progress",
      document: "/supervisor/documents",
      alert: "/supervisor/alerts",
    };
    const base = map[result.type] || "#";
    return `${base}/${result.id}`;
  }

  function getResultIcon(type: string): string {
    return (
      {
        project: "📁",
        purchase: "🛒",
        delivery: "📦",
        progress_report: "📊",
        document: "📄",
        alert: "⚠️",
      }[type] || "📌"
    );
  }

  function getResultLabel(type: string): string {
    return (
      {
        project: "Proyecto",
        purchase: "Compra",
        delivery: "Entrega",
        progress_report: "Progreso",
        document: "Documento",
        alert: "Alerta",
      }[type] || type
    );
  }

  return (
    <div className="sv-search-page">
      {/* HEADER */}
      <div className="sv-search-header">
        <h1 className="sv-search-title">Búsqueda Global</h1>
        <p className="sv-search-subtitle">
          Explora todos los módulos asociados a tus proyectos.
        </p>
      </div>

      {/* FORM */}
      <form onSubmit={handleSearch} className="sv-search-form">
        <div className="sv-input-group">
          <input
            type="text"
            className="sv-search-input"
            placeholder="Buscar proyectos, compras, entregas, documentos…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button className="sv-search-btn" disabled={loading}>
            {loading ? "Buscando…" : "Buscar"}
          </button>
        </div>
      </form>

      <div className="sv-search-layout">
        {/* SIDEBAR / FILTROS */}
        <aside className="sv-search-sidebar">
          <div className="sv-filters-header">
            <h3 className="sv-filters-title">Filtros</h3>
            <button
              className="sv-filters-toggle"
              onClick={() => setShowFilters(!showFilters)}
            >
              {showFilters ? "Ocultar" : "Mostrar"}
            </button>
          </div>

          {showFilters && (
            <div className="sv-filters-content">
              {/* PROYECTOS */}
              <div className="sv-filter-section">
                <h4>Código del Proyecto</h4>
                <input
                  type="text"
                  className="sv-filter-input"
                  placeholder="PRJ-001"
                  value={filters.project_code || ""}
                  onChange={(e) =>
                    handleFilterChange("project_code", e.target.value)
                  }
                />
              </div>

              <div className="sv-filter-section">
                <h4>Estado del Proyecto</h4>
                <select
                  className="sv-filter-select"
                  value={filters.project_status || ""}
                  onChange={(e) =>
                    handleFilterChange("project_status", e.target.value)
                  }
                >
                  <option value="">Todos</option>
                  <option value="active">Activo</option>
                  <option value="completed">Completado</option>
                  <option value="paused">Pausado</option>
                  <option value="cancelled">Cancelado</option>
                </select>
              </div>

              {/* COMPRAS */}
              <div className="sv-filter-section">
                <h4>Proveedor</h4>
                <input
                  type="text"
                  className="sv-filter-input"
                  placeholder="Proveedor"
                  value={filters.supplier || ""}
                  onChange={(e) =>
                    handleFilterChange("supplier", e.target.value)
                  }
                />
              </div>

              {/* ENTREGAS */}
              <div className="sv-filter-section">
                <h4>Cantidad (min/max)</h4>
                <input
                  type="number"
                  className="sv-filter-input"
                  placeholder="Min"
                  value={filters.min_quantity || ""}
                  onChange={(e) =>
                    handleFilterChange(
                      "min_quantity",
                      e.target.value ? Number(e.target.value) : undefined
                    )
                  }
                />
                <input
                  type="number"
                  className="sv-filter-input"
                  placeholder="Max"
                  value={filters.max_quantity || ""}
                  onChange={(e) =>
                    handleFilterChange(
                      "max_quantity",
                      e.target.value ? Number(e.target.value) : undefined
                    )
                  }
                />
              </div>

              {/* DOCUMENTOS */}
              <div className="sv-filter-section">
                <h4>Tipo de Documento</h4>
                <select
                  className="sv-filter-select"
                  value={filters.document_type || ""}
                  onChange={(e) =>
                    handleFilterChange("document_type", e.target.value)
                  }
                >
                  <option value="">Todos</option>
                  <option value="contract">Contrato</option>
                  <option value="invoice">Factura</option>
                  <option value="report">Reporte</option>
                  <option value="blueprint">Plano</option>
                  <option value="certificate">Certificado</option>
                </select>
              </div>

              {/* ALERTAS */}
              <div className="sv-filter-section">
                <h4>Severidad</h4>
                <select
                  className="sv-filter-select"
                  value={filters.severity || ""}
                  onChange={(e) =>
                    handleFilterChange("severity", e.target.value)
                  }
                >
                  <option value="">Todas</option>
                  <option value="critical">Crítica</option>
                  <option value="high">Alta</option>
                  <option value="medium">Media</option>
                  <option value="low">Baja</option>
                </select>
              </div>

              {/* ACCIONES */}
              <div className="sv-filter-actions">
                <button className="sv-btn-primary" onClick={applyFilters}>
                  Aplicar
                </button>
                <button className="sv-btn-secondary" onClick={clearFilters}>
                  Limpiar
                </button>
              </div>
            </div>
          )}
        </aside>

        {/* RESULTADOS */}
        <main className="sv-search-main">
          {error && <div className="sv-error-box">{error}</div>}

          {!loading && !error && results.length === 0 && query && (
            <div className="sv-empty-box">
              <p>No se encontraron resultados para "{query}"</p>
            </div>
          )}

          {!loading && results.length > 0 && (
            <>
              <p className="sv-results-count">
                {totalItems} resultado{totalItems !== 1 ? "s" : ""}
              </p>

              <div className="sv-results-grid">
                {results.map((r) => (
                  <div key={`${r.type}-${r.id}`} className="sv-result-card">
                    <div className="sv-result-icon">
                      {getResultIcon(r.type)}
                    </div>

                    <div className="sv-result-info">
                      <h3>{r.label}</h3>
                      <span className="sv-result-type">
                        {getResultLabel(r.type)}
                      </span>

                      <div className="sv-result-badges">
                        {r.project_code && (
                          <span className="badge badge-project">
                            {r.project_code}
                          </span>
                        )}
                        <span className="badge badge-score">
                          Score: {r.score}
                        </span>
                      </div>
                    </div>

                    <button
                      className="sv-btn-primary"
                      onClick={() => router.push(getResultUrl(r))}
                    >
                      Ver
                    </button>
                  </div>
                ))}
              </div>

              {/* PAGINACIÓN */}
              {totalPages > 1 && (
                <div className="sv-pagination">
                  <button
                    disabled={currentPage === 1}
                    onClick={() =>
                      performSearch(query, currentPage - 1, filters)
                    }
                  >
                    ← Anterior
                  </button>

                  <span>
                    Página {currentPage} de {totalPages}
                  </span>

                  <button
                    disabled={currentPage === totalPages}
                    onClick={() =>
                      performSearch(query, currentPage + 1, filters)
                    }
                  >
                    Siguiente →
                  </button>
                </div>
              )}
            </>
          )}

          {loading && (
            <div className="sv-loading">
              <div className="sv-spinner" />
              <p>Buscando…</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
