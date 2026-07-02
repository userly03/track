from rest_framework import serializers


class SearchResultSerializer(serializers.Serializer):
    """
    Serializa un solo resultado unificado de búsqueda.
    """

    type = serializers.CharField()
    id = serializers.IntegerField()
    score = serializers.IntegerField()
    label = serializers.CharField()

    project_id = serializers.IntegerField(required=False, allow_null=True)
    project_code = serializers.CharField(required=False, allow_null=True)

    metadata = serializers.DictField(child=serializers.JSONField(), required=False)


class PaginationSerializer(serializers.Serializer):
    """
    Serializador estándar de paginación empresarial (Fase 7).
    """

    page = serializers.IntegerField()
    page_size = serializers.IntegerField()
    total_items = serializers.IntegerField()
    total_pages = serializers.IntegerField()


class SearchGlobalResponseSerializer(serializers.Serializer):
    """
    Para responder:

    {
      "results": [...],
      "pagination": {...}
    }
    """

    results = SearchResultSerializer(many=True)
    pagination = PaginationSerializer()
