import json
from typing import Any, Dict

from django.http import JsonResponse
from django.core.paginator import Paginator, EmptyPage
from rest_framework.views import APIView
from rest_framework.request import Request

from .services import global_search
from .serializers import SearchGlobalResponseSerializer


class GlobalSearchView(APIView):
    """
    GET /api/search/?q=cemento&page=1&page_size=20&ordering=-score&filters={...}

    Ejemplo:
    /api/search/?q=plano&filters={"documents":{"document_type":"plano"}}
    """

    def get(self, request: Request):
        # -------------------------
        # 1. Obtener parámetros básicos
        # -------------------------
        query = request.GET.get("q", "").strip()

        ordering = request.GET.get("ordering", "-score")

        # -------------------------
        # 2. Page + Page Size
        # -------------------------
        try:
            page = int(request.GET.get("page", "1"))
        except ValueError:
            page = 1

        try:
            page_size = int(request.GET.get("page_size", "20"))
        except ValueError:
            page_size = 20

        if page_size <= 0:
            page_size = 20
        if page <= 0:
            page = 1

        # -------------------------
        # 3. Filters (JSON)
        # -------------------------
        raw_filters = request.GET.get("filters", "{}")

        try:
            filters: Dict[str, Any] = json.loads(raw_filters)
            if not isinstance(filters, dict):
                filters = {}
        except json.JSONDecodeError:
            filters = {}

        # -------------------------
        # 4. Ejecutar búsqueda global
        # -------------------------
        full_results = global_search(
            query=query,
            filters=filters,
            ordering=ordering,
        )

        # -------------------------
        # 5. Paginación empresarial PRO
        # -------------------------
        paginator = Paginator(full_results, page_size)

        try:
            page_obj = paginator.page(page)
        except EmptyPage:
            page = paginator.num_pages
            page_obj = paginator.page(page)

        serialized = {
            "results": page_obj.object_list,
            "pagination": {
                "page": page,
                "page_size": page_size,
                "total_items": paginator.count,
                "total_pages": paginator.num_pages,
            },
        }

        # -------------------------
        # 6. Serializar correctamente con DRF
        # -------------------------
        response = SearchGlobalResponseSerializer(serialized)

        return JsonResponse(response.data, safe=False, status=200)
