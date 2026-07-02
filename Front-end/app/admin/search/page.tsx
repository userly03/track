"use client";

import type React from "react";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import {
  globalSearch,
  type SearchResult,
  type SearchFilters,
} from "@/src/lib/api/search";

import "@/styles/search-admin.css"; // ⬅️ NUEVO NOMBRE CONSISTENTE

export default function SearchPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Estados
  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalItems, setTotalItems] = useState(0);

  // Filtros
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({});

  // Cuando cambia ?q en la URL, ejecutar búsqueda
  useEffect(() => {
    const q = searchParams.get("q");
    if (q) {
      setQuery(q);
      performSearch(q, 1, filters);
    }
  }, [searchParams]);

  async function performSearch(
    searchQuery: string,
    page: number,
    searchFilters: SearchFilters
  ) {
    if (!searchQuery.trim()) {
      setError("Debe ingresar un término de búsqueda.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await globalSearch({
        q: searchQuery,
        page,
        filters: searchFilters,
      });

      setResults(response.results);
      setCurrentPage(response.pagination.page);
      setTotalPages(response.pagination.total_pages);
      setTotalItems(response.pagination.total_items);
    } catch (err: any) {
      setError(err.message || "Error al realizar la búsqueda");
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;

    router.push(`/admin/search?q=${encodeURIComponent(query)}`);
    performSearch(query, 1, filters);
  }

  function handleFilterChange(key: keyof SearchFilters, value: any) {
    const newFilters = { ...filters };
    if (!value) delete newFilters[key];
    else newFilters[key] = value;

    setFilters(newFilters);
  }

  function applyFilters() {
    performSearch(query, 1, filters);
  }

  function clearFilters() {
    setFilters({});
    performSearch(query, 1, {});
  }

  function handlePrevPage() {
    if (currentPage > 1) {
      performSearch(query, currentPage - 1, filters);
    }
  }

  function handleNextPage() {
    if (currentPage < totalPages) {
      performSearch(query, currentPage + 1, filters);
    }
  }

  function getResultUrl(result: SearchResult): string {
    const map: Record<string, string> = {
      project: `/admin/projects/${result.id}`,
      purchase: `/admin/purchases/${result.id}`,
      delivery: `/admin/deliveries/${result.id}`,
      progress_report: `/admin/progress/${result.id}`,
      document: `/admin/documents/${result.id}`,
      alert: `/admin/alerts/${result.id}`,
    };
    return map[result.type] || "#";
  }

  function getIcon(type: string): string {
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

  function getLabel(type: string): string {
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
    <div className="search-container">
      {/* HEADER */}
      <header className="search-header">
        <h1 className="search-title">Búsqueda Global</h1>
        <p className="search-subtitle">
          Busca en todos los módulos del sistema TrackBuild PRO
        </p>
      </header>

      {/* BUSCADOR */}
      <form onSubmit={handleSearch} className="search-form">
        <div className="search-input-group">
          <input
            type="text"
            className="search-input"
            placeholder="Buscar proyectos, compras, entregas..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? "Buscando..." : "Buscar"}
          </button>
        </div>
      </form>

      <div className="search-layout">
        {/* SIDEBAR */}
        <aside className="search-sidebar">
          <div className="filters-header">
            <h3 className="filters-title">Filtros Avanzados</h3>

            <button
              className="filters-toggle"
              onClick={() => setShowFilters(!showFilters)}
            >
              {showFilters ? "Ocultar" : "Mostrar"}
            </button>
          </div>

          {showFilters && (
            <div className="filters-content">
              {/* PROJECT FILTERS */}
              <div className="filter-section">
                <h4 className="filter-section-title">Proyectos</h4>

                <div className="filter-group">
                  <label>Código</label>
                  <input
                    className="filter-input"
                    placeholder="PRJ-001"
                    value={filters.project_code || ""}
                    onChange={(e) =>
                      handleFilterChange("project_code", e.target.value)
                    }
                  />
                </div>

                <div className="filter-group">
                  <label>Estado</label>
                  <select
                    className="filter-select"
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
              </div>

              {/* PURCHASE FILTERS */}
              <div className="filter-section">
                <h4 className="filter-section-title">Compras</h4>

                <div className="filter-group">
                  <label>Proveedor</label>
                  <input
                    className="filter-input"
                    value={filters.supplier || ""}
                    onChange={(e) =>
                      handleFilterChange("supplier", e.target.value)
                    }
                  />
                </div>

                <div className="filter-group">
                  <label>Precio mínimo</label>
                  <input
                    type="number"
                    className="filter-input"
                    value={filters.min_price || ""}
                    onChange={(e) =>
                      handleFilterChange(
                        "min_price",
                        e.target.value ? Number(e.target.value) : undefined
                      )
                    }
                  />
                </div>

                <div className="filter-group">
                  <label>Precio máximo</label>
                  <input
                    type="number"
                    className="filter-input"
                    value={filters.max_price || ""}
                    onChange={(e) =>
                      handleFilterChange(
                        "max_price",
                        e.target.value ? Number(e.target.value) : undefined
                      )
                    }
                  />
                </div>
              </div>

              {/* DELIVERY FILTERS */}
              <div className="filter-section">
                <h4 className="filter-section-title">Entregas</h4>

                <div className="filter-group">
                  <label>Cantidad mínima</label>
                  <input
                    type="number"
                    className="filter-input"
                    value={filters.min_quantity || ""}
                    onChange={(e) =>
                      handleFilterChange(
                        "min_quantity",
                        e.target.value ? Number(e.target.value) : undefined
                      )
                    }
                  />
                </div>

                <div className="filter-group">
                  <label>Cantidad máxima</label>
                  <input
                    type="number"
                    className="filter-input"
                    value={filters.max_quantity || ""}
                    onChange={(e) =>
                      handleFilterChange(
                        "max_quantity",
                        e.target.value ? Number(e.target.value) : undefined
                      )
                    }
                  />
                </div>
              </div>

              {/* PROGRESS FILTERS */}
              <div className="filter-section">
                <h4 className="filter-section-title">Progreso</h4>

                <div className="filter-group">
                  <label>Estado</label>
                  <select
                    className="filter-select"
                    value={filters.progress_status || ""}
                    onChange={(e) =>
                      handleFilterChange("progress_status", e.target.value)
                    }
                  >
                    <option value="">Todos</option>
                    <option value="pending">Pendiente</option>
                    <option value="in_progress">En Progreso</option>
                    <option value="completed">Completado</option>
                  </select>
                </div>

                <div className="filter-group">
                  <label>Desde</label>
                  <input
                    type="date"
                    className="filter-input"
                    value={filters.date_from || ""}
                    onChange={(e) =>
                      handleFilterChange("date_from", e.target.value)
                    }
                  />
                </div>

                <div className="filter-group">
                  <label>Hasta</label>
                  <input
                    type="date"
                    className="filter-input"
                    value={filters.date_to || ""}
                    onChange={(e) =>
                      handleFilterChange("date_to", e.target.value)
                    }
                  />
                </div>
              </div>

              {/* DOCUMENT FILTERS */}
              <div className="filter-section">
                <h4 className="filter-section-title">Documentos</h4>

                <div className="filter-group">
                  <label>Tipo</label>
                  <select
                    className="filter-select"
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

                <div className="filter-group">
                  <label>Versión</label>
                  <input
                    type="number"
                    className="filter-input"
                    value={filters.version_number || ""}
                    onChange={(e) =>
                      handleFilterChange(
                        "version_number",
                        e.target.value ? Number(e.target.value) : undefined
                      )
                    }
                  />
                </div>
              </div>

              {/* ALERT FILTERS */}
              <div className="filter-section">
                <h4 className="filter-section-title">Alertas</h4>

                <div className="filter-group">
                  <label>Severidad</label>
                  <select
                    className="filter-select"
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

                <div className="filter-group">
                  <label>Tipo de ítem</label>
                  <input
                    className="filter-input"
                    value={filters.item_type || ""}
                    onChange={(e) =>
                      handleFilterChange("item_type", e.target.value)
                    }
                  />
                </div>
              </div>

              {/* ACCIONES DE FILTRO */}
              <div className="filter-actions">
                <button className="btn-primary" onClick={applyFilters}>
                  Aplicar filtros
                </button>

                <button className="btn-secondary" onClick={clearFilters}>
                  Limpiar
                </button>
              </div>
            </div>
          )}
        </aside>

        {/* RESULTADOS */}
        <main className="search-main">
          {error && <div className="search-error">{error}</div>}

          {!loading && !error && results.length === 0 && query && (
            <div className="search-empty">
              <p>No se encontraron resultados para "{query}".</p>
              <p className="search-empty-hint">
                Intenta con otros términos o ajusta los filtros.
              </p>
            </div>
          )}

          {!loading && results.length > 0 && (
            <>
              <div className="search-results-header">
                <span className="search-results-count">
                  {totalItems} resultado
                  {totalItems !== 1 ? "s" : ""} encontrado
                  {totalItems !== 1 ? "s" : ""}
                </span>
              </div>

              <div className="search-results">
                {results.map((result, index) => (
                  <div
                    key={`${result.type}-${result.id}-${index}`}
                    className="search-result-card"
                  >
                    <div className="search-result-icon">
                      {getIcon(result.type)}
                    </div>

                    <div className="search-result-content">
                      <div className="search-result-header">
                        <h3 className="search-result-title">{result.label}</h3>
                        <span className="search-result-type">
                          {getLabel(result.type)}
                        </span>
                      </div>

                      <div className="search-result-meta">
                        {result.project_code && (
                          <span className="badge badge-project">
                            {result.project_code}
                          </span>
                        )}

                        <span className="badge badge-score">
                          Score: {result.score}
                        </span>

                        {result.metadata &&
                          Object.keys(result.metadata).length > 0 && (
                            <div className="search-result-metadata">
                              {Object.entries(result.metadata)
                                .slice(0, 3)
                                .map(([key, value]) => (
                                  <span
                                    key={key}
                                    className="badge badge-metadata"
                                  >
                                    {key}: {String(value)}
                                  </span>
                                ))}
                            </div>
                          )}
                      </div>
                    </div>

                    <div className="search-result-actions">
                      <button
                        className="btn-primary"
                        onClick={() => router.push(getResultUrl(result))}
                      >
                        Ver
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {totalPages > 1 && (
                <div className="search-pagination">
                  <button
                    className="pagination-btn"
                    onClick={handlePrevPage}
                    disabled={currentPage === 1}
                  >
                    ← Anterior
                  </button>

                  <span className="pagination-info">
                    Página {currentPage} de {totalPages}
                  </span>

                  <button
                    className="pagination-btn"
                    onClick={handleNextPage}
                    disabled={currentPage === totalPages}
                  >
                    Siguiente →
                  </button>
                </div>
              )}
            </>
          )}

          {loading && (
            <div className="search-loading">
              <div className="loading-spinner" />
              <p>Buscando en todos los módulos...</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
