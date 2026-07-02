from django.http import HttpResponse
from django.views import View

from .services import (
    create_project_report_pdf,
    create_alert_summary_pdf,
    create_financial_report_pdf,
)


# ==========================================================
# VIEW: REPORTE COMPLETO DE PROYECTO (PDF)
# ==========================================================
class ProjectReportPDFView(View):
    def get(self, request, project_id):
        pdf_bytes = create_project_report_pdf(project_id, user=request.user)

        response = HttpResponse(pdf_bytes, content_type="application/pdf")
        response["Content-Disposition"] = (
            f'attachment; filename="project_{project_id}_report.pdf"'
        )
        return response


# ==========================================================
# VIEW: REPORTE DE ALERTAS (PDF)
# ==========================================================
class AlertReportPDFView(View):
    def get(self, request, project_id):
        pdf_bytes = create_alert_summary_pdf(project_id, user=request.user)

        response = HttpResponse(pdf_bytes, content_type="application/pdf")
        response["Content-Disposition"] = (
            f'attachment; filename="alerts_{project_id}_report.pdf"'
        )
        return response


# ==========================================================
# VIEW: REPORTE FINANCIERO (PDF)
# ==========================================================
class FinancialReportPDFView(View):
    def get(self, request, project_id):
        pdf_bytes = create_financial_report_pdf(project_id, user=request.user)

        response = HttpResponse(pdf_bytes, content_type="application/pdf")
        response["Content-Disposition"] = (
            f'attachment; filename="financial_{project_id}_report.pdf"'
        )
        return response
