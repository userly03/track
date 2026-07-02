from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, List, Optional

from django.db.models import Q, QuerySet
from django.utils import timezone

from projects.models import Project
from purchases.models import Purchase
from deliveries.models import Delivery
from progress_reports.models import ProgressReport
from documents.models import Document
from alerts.models import Alert


@dataclass
class SearchResult:
    """
    Representa un resultado unificado de búsqueda para el endpoint global.
    """

    type: (
        str  # "project", "purchase", "delivery", "progress_report", "document", "alert"
    )
    id: int
    score: int  # 0–100
    label: str
    project_id: Optional[int] = None
    project_code: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "type": self.type,
            "id": self.id,
            "score": self.score,
            "label": self.label,
            "project_id": self.project_id,
            "project_code": self.project_code,
            "metadata": self.metadata or {},
        }


# ============================================================
# Helpers de scoring / normalización
# ============================================================


def _normalize_query(query: Optional[str]) -> str:
    return (query or "").strip()


def _text_score(query: str, *values: Any) -> int:
    """
    Calcula un score base en función de coincidencias exactas / parciales
    en uno o más campos de texto.
    """
    q = query.lower().strip()
    if not q:
        # Si no hay query, devolvemos un puntaje bajo base.
        return 10

    best = 0
    for value in values:
        if value is None:
            continue
        s = str(value).lower()

        # Coincidencia exacta fuerte
        if s == q:
            best = max(best, 80)
        # Coincidencia parcial
        elif q in s:
            best = max(best, 50)
    return best


def _clip_score(score: int) -> int:
    if score < 0:
        return 0
    if score > 100:
        return 100
    return score


def _days_diff_from_now(dt) -> Optional[int]:
    """
    Devuelve diferencia en días respecto a hoy (para boost de recencia).
    Soporta DateField y DateTimeField.
    """
    if dt is None:
        return None
    now = timezone.now()
    try:
        # DateTimeField
        return (now.date() - dt.date()).days
    except AttributeError:
        # DateField
        return (now.date() - dt).days


# ============================================================
# Búsquedas por módulo
# ============================================================


def search_projects(
    query: str, filters: Optional[Dict[str, Any]] = None
) -> List[SearchResult]:
    filters = filters or {}
    q_norm = _normalize_query(query)

    qs: QuerySet[Project] = Project.objects.all()

    # Filtros avanzados
    code = filters.get("code")
    if code:
        qs = qs.filter(code__icontains=code)

    status = filters.get("status")
    if status:
        qs = qs.filter(status=status)

    start_date_from = filters.get("start_date_from")
    start_date_to = filters.get("start_date_to")

    if start_date_from:
        qs = qs.filter(start_date__gte=start_date_from)
    if start_date_to:
        qs = qs.filter(start_date__lte=start_date_to)

    # Búsqueda por texto en campos clave
    if q_norm:
        qs = qs.filter(
            Q(code__icontains=q_norm)
            | Q(name__icontains=q_norm)
            | Q(location__icontains=q_norm)
        )

    results: List[SearchResult] = []

    for project in qs:
        base = _text_score(q_norm, project.code, project.name, project.location)

        # Priorizar proyectos activos
        if getattr(project, "status", None) == "active":
            base += 20

        score = _clip_score(base)

        label = f"{project.code} {project.name}".strip()
        results.append(
            SearchResult(
                type="project",
                id=project.id,
                score=score,
                label=label,
                project_id=project.id,
                project_code=project.code,
                metadata={
                    "status": getattr(project, "status", None),
                    "location": getattr(project, "location", None),
                },
            )
        )

    return results


def search_purchases(
    query: str, filters: Optional[Dict[str, Any]] = None
) -> List[SearchResult]:
    filters = filters or {}
    q_norm = _normalize_query(query)

    qs: QuerySet[Purchase] = Purchase.objects.select_related("project")

    supplier = filters.get("supplier")
    if supplier:
        qs = qs.filter(supplier__icontains=supplier)

    min_price = filters.get("min_price")
    max_price = filters.get("max_price")
    if min_price is not None:
        qs = qs.filter(total_price__gte=min_price)
    if max_price is not None:
        qs = qs.filter(total_price__lte=max_price)

    date_from = filters.get("date_from")
    date_to = filters.get("date_to")
    if date_from:
        qs = qs.filter(created_at__date__gte=date_from)
    if date_to:
        qs = qs.filter(created_at__date__lte=date_to)

    if q_norm:
        qs = qs.filter(Q(item_name__icontains=q_norm) | Q(supplier__icontains=q_norm))

    results: List[SearchResult] = []

    for purchase in qs:
        project = purchase.project
        base = _text_score(q_norm, purchase.item_name, purchase.supplier)

        # Boost por recencia (compras recientes más importantes)
        days = _days_diff_from_now(getattr(purchase, "created_at", None))
        if days is not None:
            if days <= 7:
                base += 15
            elif days <= 30:
                base += 8

        score = _clip_score(base)

        label = f"Compra: {purchase.item_name} – {purchase.supplier}"
        results.append(
            SearchResult(
                type="purchase",
                id=purchase.id,
                score=score,
                label=label,
                project_id=project.id if project else None,
                project_code=getattr(project, "code", None) if project else None,
                metadata={
                    "supplier": getattr(purchase, "supplier", None),
                    "total_price": str(getattr(purchase, "total_price", "")),
                    "status": getattr(purchase, "status", None),
                },
            )
        )

    return results


def search_deliveries(
    query: str, filters: Optional[Dict[str, Any]] = None
) -> List[SearchResult]:
    filters = filters or {}
    q_norm = _normalize_query(query)

    qs: QuerySet[Delivery] = Delivery.objects.select_related("project")

    # -------------------------
    # Filtros reales del modelo Delivery
    # -------------------------
    min_quantity = filters.get("min_quantity")
    max_quantity = filters.get("max_quantity")
    if min_quantity is not None:
        qs = qs.filter(quantity__gte=min_quantity)
    if max_quantity is not None:
        qs = qs.filter(quantity__lte=max_quantity)

    date_from = filters.get("date_from")
    date_to = filters.get("date_to")
    if date_from:
        qs = qs.filter(created_at__date__gte=date_from)
    if date_to:
        qs = qs.filter(created_at__date__lte=date_to)

    # -------------------------
    # Búsqueda textual REAL (description)
    # -------------------------
    if q_norm:
        qs = qs.filter(Q(description__icontains=q_norm))

    results: List[SearchResult] = []

    # -------------------------
    # Construcción de resultados
    # -------------------------
    for delivery in qs:
        project = delivery.project

        # Score basado en descripción
        base = _text_score(q_norm, delivery.description)

        # Boost por recencia
        days = _days_diff_from_now(getattr(delivery, "created_at", None))
        if days is not None:
            if days <= 7:
                base += 15
            elif days <= 30:
                base += 8

        score = _clip_score(base)

        # Etiqueta real
        label = f"Entrega: {delivery.description}"

        results.append(
            SearchResult(
                type="delivery",
                id=delivery.id,
                score=score,
                label=label,
                project_id=project.id if project else None,
                project_code=getattr(project, "code", None) if project else None,
                metadata={
                    "description": delivery.description,
                    "quantity": delivery.quantity,
                    "unit": delivery.unit,
                    "date": delivery.date.isoformat() if delivery.date else None,
                    "status": delivery.status,
                },
            )
        )

    return results


def search_progress_reports(
    query: str, filters: Optional[Dict[str, Any]] = None
) -> List[SearchResult]:
    filters = filters or {}
    q_norm = _normalize_query(query)

    qs: QuerySet[ProgressReport] = ProgressReport.objects.select_related("project")

    status = filters.get("status")
    if status:
        qs = qs.filter(status=status)

    date_from = filters.get("date_from")
    date_to = filters.get("date_to")
    if date_from:
        qs = qs.filter(date__gte=date_from)
    if date_to:
        qs = qs.filter(date__lte=date_to)

    if q_norm:
        qs = qs.filter(Q(description__icontains=q_norm))

    results: List[SearchResult] = []

    for pr in qs:
        project = pr.project
        base = _text_score(q_norm, pr.description)

        # Boost por porcentaje alto y recencia
        try:
            percentage = float(pr.percentage)
        except Exception:
            percentage = 0.0

        if percentage >= 90:
            base += 10
        elif percentage >= 50:
            base += 5

        days = _days_diff_from_now(pr.date)
        if days is not None and days <= 30:
            base += 5

        score = _clip_score(base)

        label = f"Avance {percentage:.2f}% – {project.code if project else ''}"
        results.append(
            SearchResult(
                type="progress_report",
                id=pr.id,
                score=score,
                label=label,
                project_id=project.id if project else None,
                project_code=getattr(project, "code", None) if project else None,
                metadata={
                    "percentage": percentage,
                    "status": getattr(pr, "status", None),
                    "date": pr.date.isoformat() if getattr(pr, "date", None) else None,
                },
            )
        )

    return results


def search_documents(
    query: str, filters: Optional[Dict[str, Any]] = None
) -> List[SearchResult]:
    filters = filters or {}
    q_norm = _normalize_query(query)

    qs: QuerySet[Document] = Document.objects.select_related("project")

    title = filters.get("title")
    if title:
        qs = qs.filter(title__icontains=title)

    doc_type = filters.get("document_type")
    if doc_type:
        qs = qs.filter(document_type__icontains=doc_type)

    version_number = filters.get("version_number")
    if version_number is not None:
        qs = qs.filter(version_number=version_number)

    issue_date_from = filters.get("issue_date_from")
    issue_date_to = filters.get("issue_date_to")
    if issue_date_from:
        qs = qs.filter(issue_date__gte=issue_date_from)
    if issue_date_to:
        qs = qs.filter(issue_date__lte=issue_date_to)

    if q_norm:
        qs = qs.filter(
            Q(title__icontains=q_norm)
            | Q(description__icontains=q_norm)
            | Q(document_type__icontains=q_norm)
        )

    results: List[SearchResult] = []

    for doc in qs:
        project = doc.project
        base = _text_score(q_norm, doc.title, doc.document_type, doc.description)

        # Boost por versión alta (documentos más recientes)
        if getattr(doc, "version_number", 1) >= 3:
            base += 5

        score = _clip_score(base)

        label = f"{doc.title} (v{doc.version_number})"
        results.append(
            SearchResult(
                type="document",
                id=doc.id,
                score=score,
                label=label,
                project_id=project.id if project else None,
                project_code=getattr(project, "code", None) if project else None,
                metadata={
                    "document_type": getattr(doc, "document_type", None),
                    "version_number": getattr(doc, "version_number", None),
                    "status": getattr(doc, "status", None),
                },
            )
        )

    return results


def search_alerts(
    query: str, filters: Optional[Dict[str, Any]] = None
) -> List[SearchResult]:
    filters = filters or {}
    q_norm = _normalize_query(query)

    qs: QuerySet[Alert] = Alert.objects.select_related("project")

    severity = filters.get("severity")
    if severity:
        qs = qs.filter(severity=severity)

    item_type = filters.get("item_type")
    if item_type:
        qs = qs.filter(item_type=item_type)

    status = filters.get("status")
    if status:
        qs = qs.filter(status=status)

    date_from = filters.get("date_from")
    date_to = filters.get("date_to")
    if date_from:
        qs = qs.filter(created_at__date__gte=date_from)
    if date_to:
        qs = qs.filter(created_at__date__lte=date_to)

    if q_norm:
        qs = qs.filter(Q(title__icontains=q_norm) | Q(message__icontains=q_norm))

    results: List[SearchResult] = []

    for alert in qs:
        project = alert.project
        base = _text_score(q_norm, alert.title, alert.message)

        # Boost por severidad
        severity_value = getattr(alert, "severity", None)
        if severity_value == Alert.Severity.CRITICAL:
            base += 25
        elif severity_value == Alert.Severity.WARNING:
            base += 10

        score = _clip_score(base)

        label = f"Alerta: {alert.title}"
        results.append(
            SearchResult(
                type="alert",
                id=alert.id,
                score=score,
                label=label,
                project_id=project.id if project else None,
                project_code=getattr(project, "code", None) if project else None,
                metadata={
                    "severity": severity_value,
                    "status": getattr(alert, "status", None),
                    "item_type": getattr(alert, "item_type", None),
                },
            )
        )

    return results


# ============================================================
# BÚSQUEDA GLOBAL PRO
# ============================================================


def global_search(
    query: str,
    filters: Optional[Dict[str, Any]] = None,
    ordering: str = "-score",
) -> List[Dict[str, Any]]:
    """
    Ejecuta búsqueda en:
    - projects
    - purchases
    - deliveries
    - progress_reports
    - documents
    - alerts

    `filters` se espera con esta estructura (ejemplo):
    {
        "projects": { "status": "active", "code": "PRJ-001" },
        "purchases": { "supplier": "Maestro" },
        "deliveries": { "supplier": "Sodimac" },
        "progress_reports": { "status": "approved" },
        "documents": { "document_type": "plano" },
        "alerts": { "severity": "critical" }
    }

    `ordering`:
        - "-score" (default): mayor puntaje primero
        - "score": menor puntaje primero
    """
    filters = filters or {}

    project_filters = filters.get("projects") or {}
    purchase_filters = filters.get("purchases") or {}
    delivery_filters = filters.get("deliveries") or {}
    progress_filters = filters.get("progress_reports") or {}
    document_filters = filters.get("documents") or {}
    alert_filters = filters.get("alerts") or {}

    results: List[SearchResult] = []

    # Cada módulo aporta
    results.extend(search_projects(query, project_filters))
    results.extend(search_purchases(query, purchase_filters))
    results.extend(search_deliveries(query, delivery_filters))
    results.extend(search_progress_reports(query, progress_filters))
    results.extend(search_documents(query, document_filters))
    results.extend(search_alerts(query, alert_filters))

    # Ordenamiento global por score
    if ordering == "score":
        # Ascendente
        results.sort(key=lambda r: (r.score, r.type, r.id))
    else:
        # Por defecto "-score": descendente
        results.sort(key=lambda r: (-r.score, r.type, r.id))

    # Devolvemos como dicts listos para serializar
    return [r.to_dict() for r in results]
