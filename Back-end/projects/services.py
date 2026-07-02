import hashlib
import json
from typing import TYPE_CHECKING, Dict, Any, List

from django.db.models import Sum
from django.utils import timezone

from history.services import log_action
from purchases.models import Purchase
from deliveries.models import Delivery
from progress_reports.models import ProgressReport


from alerts.models import Alert

if TYPE_CHECKING:
    from .models import Project


# ============================================================
# 1. WRAPPERS DE HASH
# ============================================================


def generate_project_hash(project: "Project") -> str:
    return project.generate_hash()


def update_project_hash(project: "Project", user=None) -> str:
    before = project.__class__.objects.get(pk=project.pk)
    previous = project.content_hash
    new_hash = generate_project_hash(project)

    project.previous_hash = previous
    project.content_hash = new_hash
    project.save(update_fields=["previous_hash", "content_hash"])

    log_action(
        action_type="project_hash_updated",
        user=user or getattr(project, "_current_user", None),
        instance_before=before,
        instance_after=project,
        project=project,
        metadata={"previous_hash": previous, "new_hash": new_hash},
    )

    return new_hash


# ============================================================
# 2. CUADRES PRO / ADVANCED COHERENCE CHECKS
# ============================================================


def calculate_financial_drift(project: "Project") -> Dict[str, Any]:
    today = timezone.now().date()
    total_days = (project.end_date_estimated - project.start_date).days
    elapsed_days = max(1, (today - project.start_date).days)

    if total_days <= 0:
        return {"value": 0, "level": "low"}

    time_ratio = elapsed_days / total_days * 100

    total_purchases = (
        Purchase.objects.filter(project=project)
        .aggregate(total=Sum("total_price"))
        .get("total")
        or 0
    )
    budget = project.budget or 0

    financial_ratio = 0 if budget == 0 else (total_purchases / budget) * 100

    if financial_ratio > 80 and time_ratio < 40:
        level = "critical"
    elif financial_ratio < 20 and time_ratio > 50:
        level = "warning"
    else:
        level = "normal"

    # 🔧 FIX: Convertir financial_ratio a float para evitar Decimal - float
    return {"value": round(float(financial_ratio) - time_ratio, 2), "level": level}


def calculate_physical_financial_drift(project: "Project") -> Dict[str, Any]:
    physical = calculate_physical_progress(project)
    financial = calculate_financial_progress(project)

    deliveries_qty = (
        Delivery.objects.filter(project=project)
        .aggregate(total=Sum("quantity"))
        .get("total")
        or 0
    )
    purchases_qty = (
        Purchase.objects.filter(project=project)
        .aggregate(total=Sum("quantity"))
        .get("total")
        or 0
    )
    deliveries_ratio = (
        0 if purchases_qty == 0 else (deliveries_qty / purchases_qty * 100)
    )

    if physical < 30 and financial > 70:
        return {"status": "critical", "physical": physical, "financial": financial}

    if physical < 50 and financial > 90:
        return {"status": "critical", "physical": physical, "financial": financial}

    if 50 <= physical <= 80 and deliveries_ratio < 40:
        return {
            "status": "medium",
            "physical": physical,
            "deliveries_ratio": deliveries_ratio,
        }

    return {"status": "ok", "physical": physical, "financial": financial}


def calculate_stock_balance(project: "Project") -> Dict[str, Any]:
    total_comprado = (
        Purchase.objects.filter(project=project)
        .aggregate(total=Sum("quantity"))
        .get("total")
        or 0
    )
    total_entregado = (
        Delivery.objects.filter(project=project)
        .aggregate(total=Sum("quantity"))
        .get("total")
        or 0
    )

    stock = total_comprado - total_entregado

    if stock < 0:
        level = "critical"
    elif total_entregado > 0 and stock > (total_entregado * 2):
        level = "warning"
    else:
        level = "normal"

    return {"value": float(stock), "level": level}


def calculate_time_drift(project: "Project") -> Dict[str, Any]:
    today = timezone.now().date()
    total_days = (project.end_date_estimated - project.start_date).days
    elapsed_days = max(1, (today - project.start_date).days)

    if total_days <= 0:
        return {"value": 0, "level": "low"}

    expected = (elapsed_days / total_days) * 100
    real = calculate_physical_progress(project)

    deviation = expected - real

    if deviation > 20:
        level = "critical"
    elif deviation > 10:
        level = "medium"
    else:
        level = "normal"

    return {"value": round(deviation, 2), "level": level}


# ============================================================
# 3. KPI EXISTENTE
# ============================================================


def calculate_physical_progress(project: "Project") -> float:
    last_report = (
        ProgressReport.objects.filter(project=project).order_by("-created_at").first()
    )
    return float(last_report.percentage if last_report else project.progress)


def calculate_financial_progress(project: "Project") -> float:
    total_purchases = (
        Purchase.objects.filter(project=project)
        .aggregate(total=Sum("total_price"))
        .get("total")
        or 0
    )
    budget = project.budget
    if budget and budget > 0:
        return float((total_purchases / budget) * 100)
    return 100.0 if total_purchases > 0 else 0.0


def calculate_material_balance(project: "Project") -> float:
    total_comprado = (
        Purchase.objects.filter(project=project)
        .aggregate(total=Sum("quantity"))
        .get("total")
        or 0
    )
    total_entregado = (
        Delivery.objects.filter(project=project)
        .aggregate(total=Sum("quantity"))
        .get("total")
        or 0
    )
    if total_comprado == 0:
        return 1.0
    return float(total_entregado / total_comprado)


def calculate_delay(project: "Project") -> int:
    today = timezone.now().date()
    return max(0, (today - project.end_date_estimated).days)


def calculate_alerts_summary(project: "Project") -> Dict[str, int]:
    qs = Alert.objects.filter(project=project, status="active")
    return {
        "critical": qs.filter(severity="critical").count(),
        "warning": qs.filter(severity="warning").count(),
        "info": qs.filter(severity="info").count(),
    }


def check_integrity_for_project(project: "Project") -> str:
    return "corruption_detected" if project.has_integrity_issue() else "ok"


# ============================================================
# 8. KPI PREDICTIVO — FASE 8 (SIN IA)
# ============================================================


def predict_delay_risk(project: "Project") -> str:
    """
    Predicción de retraso basada en:
    - desviación del cronograma (time_drift)
    - estancamiento físico
    - cantidad de alertas críticas
    """

    # Desviación temporal
    time_info = calculate_time_drift(project)
    deviation = time_info["value"]

    # Alertas activas
    alerts = calculate_alerts_summary(project)
    critical = alerts.get("critical", 0)

    # Estancamiento físico (últimos reportes)
    physical = calculate_physical_progress(project)
    financial = calculate_financial_progress(project)

    # Reglas determinísticas
    score = 0

    # Desviación temporal
    if deviation > 20:
        score += 3
    elif deviation > 10:
        score += 2
    elif deviation > 5:
        score += 1

    # Alertas críticas
    score += critical * 2

    # Estancamiento físico / financiero
    if physical < financial - 25:
        score += 2

    # Clasificación final
    if score >= 6:
        return "high"
    elif score >= 3:
        return "medium"
    return "low"


def predict_overcost_risk(project: "Project") -> str:
    """
    Predicción de sobrecosto basada en:
    - compras > 80% del presupuesto
    - avance físico < 50%
    """

    financial = calculate_financial_progress(project)
    physical = calculate_physical_progress(project)

    if financial > 80 and physical < 50:
        return "high"
    if financial > 60 and physical < 60:
        return "medium"
    return "low"


def calculate_global_risk_score(project: "Project") -> int:
    """
    Riesgo global determinístico basado en:
    - alertas
    - desviación tiempo
    - desviación financiera
    - mismatch físico/financiero
    """

    alerts = calculate_alerts_summary(project)
    crit = alerts.get("critical", 0)
    warn = alerts.get("warning", 0)

    score = crit * 2 + warn

    # Desviación temporal
    time_dev = calculate_time_drift(project)["value"]
    if time_dev > 20:
        score += 2

    # Desviación financiera
    fin_dev = calculate_financial_drift(project)["value"]
    if fin_dev > 20:
        score += 2

    # Mismatch físico financiero
    mismatch = calculate_physical_financial_drift(project)
    if mismatch.get("status") == "critical":
        score += 2

    # CAP 0–10 (recomendado)
    return min(10, max(0, score))


def calculate_health_score(project: "Project") -> int:
    """
    Score de salud 0–100 basado en penalidades:
    - desviación física
    - desviación financiera
    - alertas
    - retraso
    - stock negativo
    """

    physical = calculate_physical_progress(project)
    financial = calculate_financial_progress(project)
    time_dev = calculate_time_drift(project)["value"]
    stock = calculate_stock_balance(project)
    alerts = calculate_alerts_summary(project)

    # Salud parte de 100
    score = 100

    # Penalidad por desviaciones
    score -= abs(physical - financial) * 0.5
    score -= abs(time_dev)

    # Stock negativo
    if stock["level"] == "critical":
        score -= 15
    elif stock["level"] == "warning":
        score -= 5

    # Alertas
    score -= alerts.get("critical", 0) * 10
    score -= alerts.get("warning", 0) * 5

    # Normalización final
    return int(max(0, min(100, score)))


def get_project_kpi(project_id: int) -> Dict[str, Any]:
    from .models import Project
    from alerts.services import (
        create_alert_financial_drift,
        create_alert_physical_financial_mismatch,
        create_alert_stock_balance,
        create_alert_time_drift,
        check_supplier_risk,
        check_inactivity,
        check_overprice_trend,
        check_incomplete_deliveries,
        check_negative_stock,
        check_physical_stagnation,
    )

    project = Project.objects.get(pk=project_id)

    # ================================================
    # KPI BASE (Fase 1)
    # ================================================
    physical = calculate_physical_progress(project)
    financial = calculate_financial_progress(project)
    material_balance = calculate_material_balance(project)
    delay_days = calculate_delay(project)
    alerts_summary = calculate_alerts_summary(project)
    integrity = check_integrity_for_project(project)

    # ================================================
    # CUADRES PRO (Fase 1)
    # ================================================
    financial_drift = calculate_financial_drift(project)
    physical_financial_mismatch = calculate_physical_financial_drift(project)
    stock_balance = calculate_stock_balance(project)
    time_deviation = calculate_time_drift(project)

    # ================================================
    # Alertas automáticas (Fase 1 y Fase 2)
    # ================================================
    create_alert_financial_drift(project, financial_drift)
    create_alert_physical_financial_mismatch(project, physical_financial_mismatch)
    create_alert_stock_balance(project, stock_balance)
    create_alert_time_drift(project, time_deviation)

    check_supplier_risk(project)
    check_inactivity(project)
    check_overprice_trend(project)
    check_incomplete_deliveries(project)
    check_negative_stock(project)
    check_physical_stagnation(project)

    # ================================================
    # 🔥 FASE 8 — KPI PREDICTIVO (SIN IA)
    # ================================================
    predicted_delay = predict_delay_risk(project)
    predicted_overcost = predict_overcost_risk(project)
    risk_score = calculate_global_risk_score(project)
    health_score = calculate_health_score(project)

    # Nivel interpretado (para dashboard)
    if risk_score >= 7:
        risk_level = "high"
    elif risk_score >= 4:
        risk_level = "medium"
    else:
        risk_level = "low"

    # ================================================
    # RESULTADO FINAL KPI
    # ================================================
    return {
        # Identificación del proyecto (🟢 NUEVOS CAMPOS)
        "project_id": project.id,
        "project_code": project.code,
        "project_name": project.name,
        "status": project.status,
        # KPIs base
        "physical_progress": physical,
        "financial_progress": financial,
        "material_balance": material_balance,
        "delay_days": delay_days,
        "alerts": alerts_summary,
        "integrity": integrity,
        # Cuadres PRO
        "financial_drift": financial_drift,
        "physical_financial_mismatch": physical_financial_mismatch,
        "stock_balance": stock_balance,
        "time_deviation": time_deviation,
        # KPI predictivo
        "predicted_delay": predicted_delay,
        "predicted_overcost": predicted_overcost,
        "risk_score": risk_score,
        "risk_level": risk_level,
        "health_score": health_score,
        # Consistencia hash
        "consistency": "ok" if integrity == "ok" else "review",
    }


# ============================================================
# 5. KPI GLOBAL
# ============================================================


def get_all_projects_kpi() -> Dict[str, Any]:
    """
    KPI Global para Dashboard (Admin / Supervisor)

    Devuelve:
    - total_projects
    - delayed_projects
    - average_health_score
    - average_risk_score
    - total_alerts_critical
    - total_alerts_warning
    - total_alerts_info
    - lista de KPIs individuales (projects)
    """

    from .models import Project

    projects = Project.objects.all()
    kpi_list = []

    health_scores = []
    risk_scores = []
    delayed_projects = 0
    alerts_critical = 0
    alerts_warning = 0
    alerts_info = 0

    for p in projects:
        kpi = get_project_kpi(p.id)
        kpi_list.append(kpi)

        # Acumuladores globales
        health_scores.append(kpi.get("health_score", 0))
        risk_scores.append(kpi.get("risk_score", 0))

        alerts = kpi.get("alerts", {})
        alerts_critical += alerts.get("critical", 0)
        alerts_warning += alerts.get("warning", 0)
        alerts_info += alerts.get("info", 0)

        if kpi.get("delay_days", 0) > 0:
            delayed_projects += 1

    return {
        "total_projects": len(projects),
        "delayed_projects": delayed_projects,
        "average_health_score": (
            sum(health_scores) / len(health_scores) if health_scores else 0
        ),
        "average_risk_score": sum(risk_scores) / len(risk_scores) if risk_scores else 0,
        "total_alerts_critical": alerts_critical,
        "total_alerts_warning": alerts_warning,
        "total_alerts_info": alerts_info,
        "projects": kpi_list,
    }


from history.services import log_action, record_field_changes


def update_project(instance, data, user=None, reason=None):
    """
    Actualización PRO de Project con auditoría avanzada.
    - Captura BEFORE
    - Aplica cambios
    - Captura AFTER
    - Registra ChangeRecord por campo
    - Registra HistoryRecord
    """

    # BEFORE snapshot
    before = instance.__class__.objects.get(pk=instance.pk)

    # Aplicar cambios desde data (solo los campos que envíes)
    for field, value in data.items():
        setattr(instance, field, value)

    instance.save()

    # AFTER snapshot
    after = instance.__class__.objects.get(pk=instance.pk)

    # Auditoría detallada de campos
    record_field_changes(
        instance_before=before, instance_after=after, user=user, reason=reason
    )

    # Auditoría general del evento
    log_action(
        action_type="project_updated",
        user=user,
        instance_before=before,
        instance_after=after,
        project=instance,
        metadata={"reason": reason} if reason else {},
    )

    return instance
