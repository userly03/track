import os
import uuid
import matplotlib

matplotlib.use("Agg")  # Evitar errores en servidores sin entorno gráfico
import matplotlib.pyplot as plt

from projects.models import Project
from progress_reports.models import ProgressReport
from purchases.models import Purchase
from market.models import MarketPrice  # Si no existe, lo manejamos con fallback


# ==========================================================
# UTILIDAD: Ruta temporal para imágenes
# ==========================================================
def _temp_path(filename: str) -> str:
    base = "/tmp"
    if not os.path.exists(base):
        os.makedirs(base)
    return os.path.join(base, filename)


# ==========================================================
# GRAFICO 1: AVANCE FÍSICO
# ==========================================================
def generate_progress_chart(project_id: int) -> str:
    reports = ProgressReport.objects.filter(project_id=project_id).order_by(
        "created_at"
    )

    # Si no hay reportes, generamos gráfico base
    if not reports.exists():
        x = [0]
        y = [0]
    else:
        x = [r.created_at.date().isoformat() for r in reports]
        # Intentar obtener el campo correcto del avance físico

        y = []
        for r in reports:
            progress_value = (
                getattr(r, "progress", None)
                or getattr(r, "physical_progress", None)
                or getattr(r, "percentage", None)
                or getattr(r, "advance_percent", None)
                or getattr(r, "progress_value", None)
                or getattr(r, "current_progress", None)
                or 0
            )
            y.append(float(progress_value))

    plt.figure(figsize=(8, 3))
    plt.plot(x, y, marker="o")
    plt.title("Avance Físico del Proyecto")
    plt.xlabel("Fecha")
    plt.ylabel("Progreso (%)")
    plt.grid(True)

    filename = f"progress_{uuid.uuid4().hex}.png"
    path = _temp_path(filename)
    plt.savefig(path, bbox_inches="tight")
    plt.close()
    return path


# ==========================================================
# GRAFICO 2: COMPARACIÓN FINANCIERA
# Real vs Precio Mercado
# ==========================================================
def generate_financial_comparison_chart(project_id: int) -> str:
    purchases = Purchase.objects.filter(project_id=project_id)

    labels = []
    real_prices = []
    market_prices = []

    for p in purchases:
        labels.append(p.item_name)
        real_prices.append(float(p.unit_price))

        try:
            match = (
                MarketPrice.objects.filter(item_name__icontains=p.item_name)
                .order_by("-created_at")
                .first()
            )
            if match:
                market_prices.append(float(match.price))
            else:
                # fallback: usar el mismo precio real si mercado está vacío
                market_prices.append(float(p.unit_price))
        except Exception:
            market_prices.append(float(p.unit_price))

    if not labels:
        labels = ["Sin compras"]
        real_prices = [0]
        market_prices = [0]

    plt.figure(figsize=(8, 3))
    x = range(len(labels))

    plt.bar(x, real_prices, width=0.4, label="Precio Real")
    plt.bar([i + 0.4 for i in x], market_prices, width=0.4, label="Precio Mercado")

    plt.xticks([i + 0.2 for i in x], labels, rotation=35, ha="right")
    plt.title("Comparación Financiera — Compras vs Mercado")
    plt.ylabel("Precio Unitario")
    plt.legend()
    plt.grid(True, axis="y")

    filename = f"financial_{uuid.uuid4().hex}.png"
    path = _temp_path(filename)

    plt.savefig(path, bbox_inches="tight")
    plt.close()
    return path
