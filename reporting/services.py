import io
from datetime import datetime
from django.shortcuts import get_object_or_404
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Image,
    Table,
    TableStyle,
)
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import cm

from projects.models import Project
from alerts.models import Alert
from purchases.models import Purchase
from progress_reports.models import ProgressReport
from history.models import ChangeRecord


from .utils.charts import (
    generate_progress_chart,
    generate_financial_comparison_chart,
)


# ==========================================================
# UTILIDAD: Branding simple
# ==========================================================
def _title(text):
    return Paragraph(
        f"<b><font size=16>{text}</font></b>", getSampleStyleSheet()["Title"]
    )


def _h2(text):
    return Paragraph(
        f"<b><font size=13>{text}</font></b>", getSampleStyleSheet()["Heading2"]
    )


def _p(text):
    return Paragraph(f"<font size=10>{text}</font>", getSampleStyleSheet()["BodyText"])


# ==========================================================
# REPORTE 1: REPORTE COMPLETO DE PROYECTO
# ==========================================================
def create_project_report_pdf(project_id: int, user=None) -> bytes:

    project = get_object_or_404(Project, id=project_id)

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4)

    elements = []
    elements.append(_title(f"Reporte Completo del Proyecto — {project.name}"))
    elements.append(Spacer(1, 0.5 * cm))

    # ------------------------------------------------------
    # INFO DEL PROYECTO
    # ------------------------------------------------------
    elements.append(_h2("Información del Proyecto"))
    elements.append(_p(f"Ubicación: {project.location}"))
    elements.append(_p(f"Estado: {project.status}"))
    elements.append(_p(f"Fecha inicio: {project.start_date}"))
    elements.append(
        _p(f"Presupuesto (metadata): {project.metadata.get('budget', 'N/A')}")
    )
    elements.append(Spacer(1, 0.5 * cm))

    # ------------------------------------------------------
    # KPI (placeholder - fase 11 se integrará)
    # ------------------------------------------------------
    elements.append(_h2("KPIs del Proyecto (Placeholder – Fase 11)"))
    elements.append(_p("KPI progreso: pendiente de integración en fase 11"))
    elements.append(Spacer(1, 0.5 * cm))

    # ------------------------------------------------------
    # ALERTAS ACTIVAS
    # ------------------------------------------------------
    alerts = Alert.objects.filter(project=project)

    if alerts.exists():
        data = [["Tipo", "Severidad", "Fecha", "Descripción"]]
        for a in alerts:
            alert_type = getattr(a, "alert_type", getattr(a, "type", "N/A"))
            severity = getattr(a, "severity", getattr(a, "level", "N/A"))
            created_at = getattr(a, "created_at", None)
            if created_at and hasattr(created_at, "date"):
                created_str = str(created_at.date())
            else:
                created_str = "N/A"
            description = getattr(a, "description", "")

            data.append([alert_type, severity, created_str, description])

        table = Table(data, colWidths=[3 * cm, 3 * cm, 3 * cm, 8 * cm])
        table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.gray),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                    ("BOX", (0, 0), (-1, -1), 1, colors.black),
                    ("GRID", (0, 0), (-1, -1), 0.5, colors.black),
                ]
            )
        )
        elements.append(table)
    else:
        elements.append(_p("No hay alertas registradas"))
    elements.append(Spacer(1, 0.5 * cm))

    # ------------------------------------------------------
    # HISTORIAL
    # ------------------------------------------------------
    history_entries = ChangeRecord.objects.filter(
        model_name="Project", object_id=project.id
    ).order_by("-timestamp")

    elements.append(_h2("Historial del Proyecto"))
    if history_entries.exists():
        for h in history_entries[:20]:
            ts = h.timestamp.date() if hasattr(h.timestamp, "date") else "N/A"
            elements.append(_p(f"{ts} — {h.field}: {h.old_value} → {h.new_value}"))
    else:
        elements.append(_p("No existe historial registrado"))
    elements.append(Spacer(1, 0.5 * cm))

    # ------------------------------------------------------
    # GRAFICO DE AVANCE
    # ------------------------------------------------------
    chart_path = generate_progress_chart(project_id)
    elements.append(_h2("Gráfico de Avance Físico"))
    elements.append(Image(chart_path, width=15 * cm, height=6 * cm))
    elements.append(Spacer(1, 0.5 * cm))

    # ------------------------------------------------------
    # HASH FINAL
    # ------------------------------------------------------
    elements.append(_h2("Hash del Reporte"))
    elements.append(_p(f"Generado: {datetime.now().isoformat()}"))
    elements.append(_p(f"Generado por: {user.username if user else 'N/A'}"))

    doc.build(elements)
    pdf = buffer.getvalue()
    buffer.close()
    return pdf


# ==========================================================
# REPORTE 2: ALERTAS
# ==========================================================
def create_alert_summary_pdf(project_id: int, user=None) -> bytes:

    project = get_object_or_404(Project, id=project_id)
    alerts = Alert.objects.filter(project=project)

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4)
    elements = []

    elements.append(_title(f"Resumen de Alertas del Proyecto — {project.name}"))
    elements.append(Spacer(1, 0.5 * cm))

    if alerts.exists():
        data = [["Tipo", "Severidad", "Fecha", "Descripción"]]
        for a in alerts:
            alert_type = getattr(a, "alert_type", getattr(a, "type", "N/A"))
            severity = getattr(a, "severity", getattr(a, "level", "N/A"))
            created_at = getattr(a, "created_at", None)
            if created_at and hasattr(created_at, "date"):
                created_str = str(created_at.date())
            else:
                created_str = "N/A"
            description = getattr(a, "description", "")

            data.append([alert_type, severity, created_str, description])

        table = Table(data, colWidths=[3 * cm, 3 * cm, 3 * cm, 8 * cm])
        table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.red),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                    ("BOX", (0, 0), (-1, -1), 1, colors.black),
                    ("GRID", (0, 0), (-1, -1), 0.5, colors.black),
                ]
            )
        )
        elements.append(table)
    else:
        elements.append(_p("No hay alertas activas."))

    doc.build(elements)
    pdf = buffer.getvalue()
    buffer.close()
    return pdf


# ==========================================================
# REPORTE 3: FINANCIERO
# ==========================================================
def create_financial_report_pdf(project_id: int, user=None) -> bytes:

    project = get_object_or_404(Project, id=project_id)

    purchases = Purchase.objects.filter(project=project)

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4)
    elements = []

    elements.append(_title(f"Reporte Financiero — {project.name}"))
    elements.append(Spacer(1, 0.5 * cm))

    # ------------------------------------------------------
    # TABLA DE COMPRAS
    # ------------------------------------------------------
    elements.append(_h2("Compras Realizadas"))

    if purchases.exists():
        data = [["Item", "Cantidad", "Precio Unit.", "Prov.", "Total"]]
        for p in purchases:
            data.append(
                [
                    p.item_name,
                    p.quantity,
                    str(p.unit_price),
                    p.supplier,
                    str(p.total_price),
                ]
            )

        table = Table(data, colWidths=[4 * cm, 2 * cm, 3 * cm, 3 * cm, 3 * cm])
        table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.gray),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                    ("BOX", (0, 0), (-1, -1), 1, colors.black),
                    ("GRID", (0, 0), (-1, -1), 0.5, colors.black),
                ]
            )
        )
        elements.append(table)
    else:
        elements.append(_p("No se registran compras."))

    elements.append(Spacer(1, 0.5 * cm))

    # ------------------------------------------------------
    # GRAFICO COMPARATIVO FINANCIERO
    # ------------------------------------------------------
    chart_path = generate_financial_comparison_chart(project_id)
    elements.append(_h2("Comparación Financiera: Real vs Mercado"))
    elements.append(Image(chart_path, width=15 * cm, height=6 * cm))

    doc.build(elements)
    pdf = buffer.getvalue()
    buffer.close()
    return pdf
