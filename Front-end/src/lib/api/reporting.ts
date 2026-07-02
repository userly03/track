// src/lib/api/reporting.ts

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8081";

/* ================================
   REPORTE GENERAL DEL PROYECTO
================================ */

export async function downloadProjectReport(projectId: number): Promise<void> {
  const accessToken = localStorage.getItem("access_token");

  const response = await fetch(
    `${API_BASE_URL}/api/reporting/project/${projectId}/pdf/`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error("Error al generar el reporte");
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `proyecto_${projectId}_reporte_completo.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}

/* =====================================
   REPORTE DE ALERTAS DEL PROYECTO
===================================== */

export async function downloadAlertsReport(projectId: number): Promise<void> {
  const accessToken = localStorage.getItem("access_token");

  const response = await fetch(
    `${API_BASE_URL}/api/reporting/alerts/${projectId}/pdf/`,
    {
      method: "GET",
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!response.ok) {
    throw new Error("Error al generar el reporte de alertas");
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `proyecto_${projectId}_alertas.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}

/* =====================================
   REPORTE FINANCIERO DEL PROYECTO
===================================== */

export async function downloadFinancialReport(projectId: number): Promise<void> {
  const accessToken = localStorage.getItem("access_token");

  const response = await fetch(
    `${API_BASE_URL}/api/reporting/financial/${projectId}/pdf/`,
    {
      method: "GET",
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!response.ok) {
    throw new Error("Error al generar el reporte financiero");
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `proyecto_${projectId}_financiero.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}
