from django.contrib import admin
from django.utils.html import format_html
from django.utils import timezone

from .models import Project


@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    """
    Panel Admin Profesional para TrackBuild.
    Incluye:
    - Indicadores visuales de progreso y retraso
    - Filtros avanzados
    - UI ordenada en secciones
    """

    # ============================================================
    #   LIST DISPLAY
    # ============================================================
    list_display = (
        "code",
        "name",
        "location",
        "status",
        "progress_display",
        "delay_status",
        "start_date",
        "end_date_estimated",
        "created_at",
    )

    # Columnas clickeables
    list_display_links = ("code", "name")

    # ============================================================
    #   BUSCADOR + FILTROS
    # ============================================================
    search_fields = ("code", "name", "location", "status")

    list_filter = (
        "status",
        ("start_date", admin.DateFieldListFilter),
        ("end_date_estimated", admin.DateFieldListFilter),
    )

    # ============================================================
    #   READ ONLY FIELDS
    # ============================================================
    readonly_fields = (
        "content_hash",
        "previous_hash",
        "created_at",
        "updated_at",
    )

    # ============================================================
    #   FIELDSETS ORGANIZADOS
    # ============================================================
    fieldsets = (
        (
            "Información General",
            {"fields": ("code", "name", "location", "status", "progress")},
        ),
        (
            "Fechas del Proyecto",
            {"fields": ("start_date", "end_date_estimated")},
        ),
        (
            "Metadata",
            {"fields": ("metadata",)},
        ),
        (
            "Auditoría e Integridad",
            {"fields": ("content_hash", "previous_hash", "created_at", "updated_at")},
        ),
    )

    # ============================================================
    #   MÉTODOS VISUALES PRO
    # ============================================================
    def delay_status(self, obj: Project):
        """
        Indicador visual de retraso.
        """
        today = timezone.now().date()

        if not obj.end_date_estimated:
            return format_html('<span style="color:#f4b400;">SIN FECHA</span>')

        if today > obj.end_date_estimated:
            return format_html(
                '<span style="color:#db4437; font-weight:bold;">RETRASADO</span>'
            )

        return format_html(
            '<span style="color:#0f9d58; font-weight:bold;">EN FECHA</span>'
        )

    delay_status.short_description = "Estado Temporal"

    def progress_display(self, obj: Project):
        """
        Barra visual del progreso en %.
        """
        percentage = float(obj.progress or 0)
        bar_color = (
            "#0f9d58"  # verde
            if percentage >= 80
            else "#f4b400" if percentage >= 40 else "#db4437"  # amarillo  # rojo
        )

        return format_html(
            """
            <div style="width: 110px; background: #e0e0e0; border-radius: 4px;">
                <div style="
                    width: {}%;
                    background: {};
                    color: white;
                    text-align: center;
                    border-radius: 4px;
                    font-size: 11px;
                ">
                    {}%
                </div>
            </div>
            """,
            percentage,
            bar_color,
            percentage,
        )

    progress_display.short_description = "Progreso"
