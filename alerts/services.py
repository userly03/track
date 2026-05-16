from django.utils import timezone
from django.db.models import Sum, Avg, F
from datetime import timedelta

from .models import Alert
from projects.models import Project
from purchases.models import Purchase
from deliveries.models import Delivery
from progress_reports.models import ProgressReport
from documents.models import Document
from validation.models import ValidationItem
from projects.services import calculate_delay

from history.services import log_action


# =====================================================================
# 🔵 GENERACIÓN DE ALERTAS BASE (NO TOCAR)
# =====================================================================


def create_alert(
    project,
    item_type,
    item_id=0,
    severity="warning",
    title="",
    message="",
    metadata=None,
):
    from .models import Alert

    # 🔥 1. PREVENIR ALERTAS DUPLICADAS (PARCHE CRÍTICO)
    existing = Alert.objects.filter(
        project=project, item_type=item_type, item_id=item_id
    ).first()
    if existing:
        return existing  # ⬅ NO CREA OTRA, RETORNA LA MISMA

    # 🔥 2. CREAR ALERTA SI NO EXISTE
    alert = Alert.objects.create(
        project=project,
        item_type=item_type,
        item_id=item_id,
        severity=severity,
        title=title,
        message=message,
        metadata=metadata or {},
    )
    return alert


# ======================================================
# 1. PROVEEDOR SOSPECHOSO
# ======================================================
def check_supplier_risk(project: Project):
    """
    Regla:
    - Un proveedor aparece en 3 compras seguidas
    - Y su precio > 20% del mercado
    """

    purchases = (
        Purchase.objects.filter(project=project)
        .exclude(supplier__isnull=True)
        .order_by("-created_at")[:5]
    )

    if len(purchases) < 3:
        return

    # Agrupar últimos proveedores
    last_suppliers = [p.supplier for p in purchases[:3]]
    if len(set(last_suppliers)) != 1:
        return

    supplier = last_suppliers[0]
    last_purchase = purchases[0]

    market_price = last_purchase.metadata.get("market_price")
    if not market_price:
        return

    if float(last_purchase.unit_price) <= market_price * 1.20:
        return

    # Crear alerta
    create_alert(
        project=project,
        item_type="supplier_risk",
        item_id=last_purchase.id,
        severity="warning",
        title="Proveedor sospechoso",
        message=(
            f"El proveedor '{supplier}' aparece repetidamente en compras recientes "
            f"y sus precios superan el mercado en más del 20%."
        ),
        metadata={
            "supplier": supplier,
            "unit_price": float(last_purchase.unit_price),
            "market_price": market_price,
        },
    )


# ======================================================
# 2. INACTIVIDAD EN AVANCES Y ENTREGAS
# ======================================================
def check_inactivity(project: Project):
    """
    - 0 avances en 14 días → warning
    - 0 entregas en 30 días → warning/critical
    """

    today = timezone.now().date()

    # Último avance
    last_progress = (
        ProgressReport.objects.filter(project=project).order_by("-date").first()
    )
    last_progress_date = last_progress.date if last_progress else None

    # Última entrega
    last_delivery = Delivery.objects.filter(project=project).order_by("-date").first()
    last_delivery_date = last_delivery.date if last_delivery else None

    # INACTIVIDAD AVANCES (14 días)
    if last_progress_date and (today - last_progress_date).days >= 14:
        create_alert(
            project=project,
            item_type="inactivity",
            item_id=last_progress.id if last_progress else 0,
            severity="warning",
            title="Inactividad de avances",
            message="No se registran avances en más de 14 días.",
            metadata={"days": (today - last_progress_date).days},
        )

    # INACTIVIDAD ENTREGAS (30 días)
    if last_delivery_date and (today - last_delivery_date).days >= 30:
        create_alert(
            project=project,
            item_type="inactivity",
            item_id=last_delivery.id if last_delivery else 0,
            severity="critical",
            title="Inactividad de entregas",
            message="No se registran entregas en más de 30 días.",
            metadata={"days": (today - last_delivery_date).days},
        )


# ======================================================
# 3. SOBREPRECIO ACUMULADO
# ======================================================
def check_overprice_trend(project: Project):
    """
    - Precio promedio de compras > 25% del mercado.
    Necesita que metadata.market_price exista.
    """

    qs = Purchase.objects.filter(project=project)

    if qs.count() < 3:
        return

    prices = []
    market_prices = []

    for p in qs:
        if p.metadata and p.metadata.get("market_price") is not None:
            market_value = p.metadata.get("market_price")

            # Ignorar valores no numéricos (dict, list, None, etc.)
            try:
                market_value = float(market_value)
            except (TypeError, ValueError):
                continue  # ignorar este purchase

            prices.append(float(p.unit_price))
            market_prices.append(market_value)

    if not prices or not market_prices:
        return

    avg_price = sum(prices) / len(prices)
    avg_market = sum(market_prices) / len(market_prices)

    if avg_price <= avg_market * 1.25:
        return

    create_alert(
        project=project,
        item_type="overprice_trend",
        item_id=0,
        severity="warning",
        title="Tendencia de sobreprecio acumulado",
        message=(
            "El promedio de precios de compra excede al promedio de mercado "
            "en más del 25%."
        ),
        metadata={
            "average_price": avg_price,
            "average_market": avg_market,
        },
    )


# ======================================================
# 4. ENTREGA INCOMPLETA REPETIDA
# ======================================================
def check_incomplete_deliveries(project: Project):
    """
    - Entregas < 80% de lo comprado en 3 eventos consecutivos.
    """

    deliveries = (
        Delivery.objects.filter(project=project)
        .exclude(purchase__isnull=True)
        .order_by("-date")[:3]
    )

    if len(deliveries) < 3:
        return

    incomplete = 0

    for d in deliveries:
        if d.purchase.quantity == 0:
            continue
        ratio = d.quantity / d.purchase.quantity
        if ratio < 0.80:
            incomplete += 1

    if incomplete < 3:
        return

    create_alert(
        project=project,
        item_type="incomplete_delivery",
        item_id=deliveries[0].id,
        severity="warning",
        title="Entregas incompletas consecutivas",
        message="Se registraron 3 entregas consecutivas con menos del 80% de lo comprado.",
        metadata={"events": incomplete},
    )


# ======================================================
# 5. STOCK NEGATIVO (de Fase 1)
# ======================================================
def check_negative_stock(project: Project):
    """
    - stock_balance < 0 → crítico
    """

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

    if stock >= 0:
        return

    create_alert(
        project=project,
        item_type="negative_stock",
        item_id=0,
        severity="critical",
        title="Stock negativo detectado",
        message=f"El stock teórico es negativo ({stock}).",
        metadata={"stock_balance": stock},
    )


# ======================================================
# 6. AVANCE FÍSICO ESTANCADO
# ======================================================
def check_physical_stagnation(project: Project):
    """
    - Avance no cambia por más de 20 días.
    """

    latest = (
        ProgressReport.objects.filter(project=project).order_by("-created_at").first()
    )

    if not latest:
        return

    today = timezone.now().date()

    days = (today - latest.date).days
    if days < 20:
        return

    create_alert(
        project=project,
        item_type="physical_stagnation",
        item_id=latest.id,
        severity="warning",
        title="Avance físico estancado",
        message=(
            f"No se registran avances desde hace {days} días. "
            "El proyecto podría estar detenido."
        ),
        metadata={"days": days, "last_progress": float(latest.percentage)},
    )


# ============================================================
# ALERTAS EXISTENTES (NO MODIFICADAS)
# ============================================================


def check_overprice(purchase: Purchase):
    if not purchase.metadata:
        return

    market_price = purchase.metadata.get("market_price")
    if not market_price:
        return

    if purchase.unit_price > market_price * 1.35:
        create_alert(
            project=purchase.project,
            item_type="purchase",
            item_id=purchase.id,
            severity="critical",
            title="Posible sobreprecio detectado",
            message=(
                f"El precio unitario ({purchase.unit_price}) "
                f"excede el precio de mercado ({market_price}) en más del 35%."
            ),
            metadata={
                "unit_price": float(purchase.unit_price),
                "market_price": market_price,
            },
        )


def check_delivery_balance(delivery: Delivery):
    """
    Regla:
    - Si no hay compra asociada → no se genera alerta de balance.
    """
    # ⚠ Sin purchase NO SE PUEDE evaluar balance
    if not delivery.purchase:
        return

    purchased_qty = delivery.purchase.quantity or 0
    delivered_qty = delivery.quantity or 0

    if delivered_qty < purchased_qty:
        create_alert(
            project=delivery.project,
            item_type="delivery",
            item_id=delivery.id,
            severity="warning",
            title="Entrega insuficiente",
            message=(
                f"La entrega ({delivered_qty}) es menor a lo comprado ({purchased_qty})."
            ),
        )

    elif delivered_qty > purchased_qty:
        create_alert(
            project=delivery.project,
            item_type="delivery",
            item_id=delivery.id,
            severity="info",
            title="Entrega excedida",
            message=(
                f"La entrega ({delivered_qty}) es mayor a lo comprado ({purchased_qty})."
            ),
        )


def check_progress_consistency(progress: ProgressReport):
    total_delivered = (
        Delivery.objects.filter(project=progress.project)
        .aggregate(Sum("quantity"))
        .get("quantity__sum")
        or 0
    )

    if float(progress.percentage) > total_delivered:

        create_alert(
            project=progress.project,
            item_type="progress",
            item_id=progress.id,
            severity="critical",
            title="Avance físico incoherente",
            message=(
                f"El avance físico ({float(progress.percentage)}%) "
                f"supera lo esperado según materiales entregados ({total_delivered})."
            ),
        )


def check_expected_progress(project: Project):
    if not project.start_date:
        return

    today = timezone.now().date()
    total_days = (project.end_date_estimated - project.start_date).days
    elapsed_days = (today - project.start_date).days

    if elapsed_days < 0 or total_days <= 0:
        return

    expected_percentage = (elapsed_days / total_days) * 100

    latest = (
        ProgressReport.objects.filter(project=project).order_by("-created_at").first()
    )
    if not latest:
        return

    if float(latest.percentage) < expected_percentage - 10:

        create_alert(
            project=project,
            item_type="progress",
            item_id=latest.id,
            severity="warning",
            title="Avance retrasado",
            message=(
                f"El avance actual ({float(latest.percentage)}%) "
                f"está por debajo de lo esperado ({expected_percentage:.1f}%)."
            ),
        )


def check_missing_documents(project: Project):
    required_types = ["invoice", "delivery_note", "evidence"]

    for doc_type in required_types:
        exists = Document.objects.filter(
            project=project, document_type=doc_type
        ).exists()

        if not exists:
            create_alert(
                project=project,
                item_type="document",
                item_id=0,
                severity="warning",
                title=f"Documento faltante: {doc_type}",
                message=f"El proyecto no tiene el documento requerido: {doc_type}.",
            )


def check_document_integrity(document: Document):
    if not document.original_hash:
        return

    if document.file_hash != document.original_hash:
        create_alert(
            project=document.project,
            item_type="document",
            item_id=document.id,
            severity="critical",
            title="Documento corrupto",
            message="El hash del archivo ha cambiado. Posible alteración.",
        )


def check_data_manipulation(instance):
    if not instance.content_hash or not instance.previous_hash:
        return

    if instance.content_hash != instance.previous_hash:
        # Resolver project de forma segura
        try:
            project = instance.get_related_object().project
        except Exception:
            project = getattr(instance, "project", None)

        create_alert(
            project=project,
            item_type="system",
            item_id=instance.id,
            severity="critical",
            title="Posible manipulación de datos",
            message="El contenido del registro no coincide con su hash anterior.",
        )


def check_late_validation(item: ValidationItem):
    if item.status != "pending":
        return

    days_pending = (timezone.now() - item.created_at).days

    if days_pending >= 5:
        create_alert(
            project=item.get_related_object().project,
            item_type="validation",
            item_id=item.id,
            severity="warning",
            title="Validación demorando demasiado",
            message=(
                f"El ítem lleva {days_pending} días sin validarse. "
                "Requiere revisión urgente."
            ),
        )


# ======================================================
# 8. KPI PRO — ALERTA: DERIVA FINANCIERA
# ======================================================
def create_alert_financial_drift(project, drift_info, metadata=None):
    """
    Genera una alerta de deriva financiera basada en los KPIs ya calculados
    en projects/services.py → calculate_financial_drift().

    drift_info es un dict con estructura:
    {
        "value": float,
        "level": "ok" | "warning" | "critical"
    }

    Solo genera alerta si level ∈ {"warning", "critical"}.
    """
    if not drift_info or not isinstance(drift_info, dict):
        return None

    level = drift_info.get("level")
    if level not in ["warning", "critical"]:
        return None

    if metadata is None:
        metadata = {}

    metadata.update(
        {
            "financial_drift_value": drift_info.get("value"),
            "financial_drift_level": drift_info.get("level"),
        }
    )

    title = "Deriva financiera detectada"
    message = (
        f"El proyecto presenta una desviación financiera: nivel '{level}'. "
        f"Valor de deriva: {drift_info.get('value')}."
    )

    return create_alert(
        project=project,
        item_type="financial_drift",
        item_id=0,
        severity="warning" if level == "warning" else "critical",
        title=title,
        message=message,
        metadata=metadata,
    )


# ======================================================
# 9. KPI PRO — ALERTA: DESFASE FÍSICO vs FINANCIERO
# ======================================================
def create_alert_physical_financial_mismatch(project, mismatch_info, metadata=None):
    """
    mismatch_info viene de calculate_physical_financial_drift() con estructura:
    {
        "status": "ok" | "warning" | "critical",
        "physical": float,
        "financial": float
    }

    Solo genera alerta si status ∈ {"warning", "critical"}.
    """
    if not mismatch_info or not isinstance(mismatch_info, dict):
        return None

    status = mismatch_info.get("status")
    if status not in ["warning", "critical"]:
        return None

    if metadata is None:
        metadata = {}

    metadata.update(
        {
            "physical_progress": mismatch_info.get("physical"),
            "financial_progress": mismatch_info.get("financial"),
            "status": mismatch_info.get("status"),
        }
    )

    title = "Desfase físico-financiero"
    message = (
        f"Existe una inconsistencia entre el avance físico ({mismatch_info.get('physical')}%) "
        f"y financiero ({mismatch_info.get('financial')}%). Nivel: {status}."
    )

    return create_alert(
        project=project,
        item_type="physical_financial_mismatch",
        item_id=0,
        severity="warning" if status == "warning" else "critical",
        title=title,
        message=message,
        metadata=metadata,
    )


# ======================================================
# 10. KPI PRO — ALERTA: DERIVA DE TIEMPO (CRONOGRAMA)
# ======================================================
def create_alert_time_drift(project, time_info, metadata=None):
    """
    time_info viene de calculate_time_drift() con estructura:
    {
        "value": float,
        "status": "ok" | "warning" | "critical"
    }

    Solo genera alerta si status ∈ {"warning", "critical"}.
    """
    if not time_info or not isinstance(time_info, dict):
        return None

    status = time_info.get("status")
    if status not in ["warning", "critical"]:
        return None

    if metadata is None:
        metadata = {}

    metadata.update(
        {
            "time_drift_value": time_info.get("value"),
            "time_drift_status": status,
        }
    )

    title = "Deriva del cronograma"
    message = (
        f"El proyecto presenta desviación temporal. Nivel: {status}. "
        f"Valor de deriva: {time_info.get('value')}."
    )

    return create_alert(
        project=project,
        item_type="time_drift",
        item_id=0,
        severity="warning" if status == "warning" else "critical",
        title=title,
        message=message,
        metadata=metadata,
    )


# ======================================================
# 11. KPI PRO — ALERTA: STOCK BALANCE
# ======================================================
def create_alert_stock_balance(project, stock_info, metadata=None):
    """
    Genera una alerta basada en el balance de stock.
    stock_info proviene de calculate_stock_balance(project) y tiene forma:
    {
        "value": float,   # stock (compras - entregas)
        "level": "critical" | "warning" | "normal"
    }

    Solo genera alerta si level es critical o warning.
    """

    if not stock_info or not isinstance(stock_info, dict):
        return None

    level = stock_info.get("level")
    if level not in ["critical", "warning"]:
        return None

    stock_value = stock_info.get("value")

    if metadata is None:
        metadata = {}

    metadata.update(
        {
            "stock_balance_value": stock_value,
            "stock_balance_level": level,
        }
    )

    title = "Riesgo en balance de stock"
    if level == "critical":
        message = (
            f"El stock es CRÍTICO ({stock_value}). Esto indica entregas mayores a compras "
            "o inconsistencias serias en registros."
        )
    else:
        message = (
            f"El stock ({stock_value}) presenta un nivel de advertencia. "
            "Podría haber desfases entre compras y entregas."
        )

    return create_alert(
        project=project,
        item_type="stock_balance",
        item_id=0,
        severity="critical" if level == "critical" else "warning",
        title=title,
        message=message,
        metadata=metadata,
    )


# ======================================================
# 12. KPI PRO — ALERTA: RETRASO DEL PROYECTO
# ======================================================
def check_project_delay(project, metadata=None):
    """
    Genera una alerta basada en el retraso del proyecto.
    Usa calculate_delay(project) para determinar cuántos días de retraso existen.
    - > 30 días → critical
    - > 7 días → warning
    - <= 7 días → no genera alerta
    """

    delay_days = calculate_delay(project)  # función ya existente

    if delay_days <= 7:
        return None

    if metadata is None:
        metadata = {}

    metadata.update(
        {
            "delay_days": delay_days,
        }
    )

    # Determinar severidad
    if delay_days > 30:
        severity = "critical"
    else:
        severity = "warning"

    title = "Retraso en el cronograma del proyecto"
    message = (
        f"El proyecto presenta un retraso de {delay_days} días "
        f"según la fecha estimada de finalización."
    )

    return create_alert(
        project=project,
        item_type="project_delay",
        item_id=0,
        severity=severity,
        title=title,
        message=message,
        metadata=metadata,
    )


def check_validation_status(item: ValidationItem):
    """
    Crea alertas basadas en el estado final del ValidationItem.
    - rejected → critical
    - approved_partial → warning
    - approved → info (opcional)
    """

    parent = item.get_related_object()
    if not parent:
        return

    project = parent.project

    # Rechazo total
    if item.status == "rejected":
        create_alert(
            project=project,
            item_type="validation",
            item_id=item.id,
            severity="critical",
            title="Validación rechazada",
            message=(
                f"El ítem {item.type} con ID {item.get_related_id()} fue RECHAZADO "
                "durante la validación W-de-N."
            ),
        )

    # Aprobación parcial
    elif item.status == "approved_partial":
        create_alert(
            project=project,
            item_type="validation",
            item_id=item.id,
            severity="warning",
            title="Aprobación parcial",
            message=(
                f"El ítem {item.type} con ID {item.get_related_id()} solo tiene "
                "aprobación parcial."
            ),
        )
