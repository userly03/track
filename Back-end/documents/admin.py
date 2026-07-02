from django.contrib import admin
from .models import Document, DocumentHistory


# ============================================================
# 🟦 INLINE DEL HISTORIAL: aparece dentro del Documento
# ============================================================


class DocumentHistoryInline(admin.TabularInline):
    model = DocumentHistory
    extra = 0
    readonly_fields = (
        "version_number",
        "file_hash",
        "content_hash",
        "previous_hash",
        "event_type",
        "performed_by",
        "comment",
        "metadata_snapshot",
        "created_at",
    )
    can_delete = False


# ============================================================
# 🟩 ADMIN PRINCIPAL DEL DOCUMENTO (PRO)
# ============================================================


@admin.register(Document)
class DocumentAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "title",
        "project",
        "version_number",
        "status",
        "is_duplicate",
        "short_file_hash",
        "short_content_hash",
        "sensitivity_level",
        "last_modified_by",
        "created_at",
    )

    list_filter = (
        "status",
        "project",
        "version_number",
        "is_duplicate",
        "document_type",
        "responsible_area",
        "sensitivity_level",
        "created_at",
    )

    search_fields = (
        "title",
        "description",
        "project__name",
        "project__code",
        "author",
        "document_type",
    )

    readonly_fields = (
        "file_hash",
        "content_hash",
        "previous_hash",
        "version_number",
        "is_duplicate",
        "original_document",
        "created_at",
        "updated_at",
        "last_modified_by",
    )

    inlines = [DocumentHistoryInline]

    fieldsets = (
        (
            "Información General",
            {
                "fields": (
                    "project",
                    "purchase",
                    "delivery",
                    "progress_report",
                    "title",
                    "description",
                    "file",
                )
            },
        ),
        (
            "Control Documental PRO",
            {
                "fields": (
                    "version_number",
                    "file_hash",
                    "content_hash",
                    "previous_hash",
                    "is_duplicate",
                    "original_document",
                )
            },
        ),
        (
            "Metadata PRO",
            {
                "fields": (
                    "author",
                    "document_type",
                    "issue_date",
                    "responsible_area",
                    "sensitivity_level",
                    "metadata",
                )
            },
        ),
        (
            "Auditoría",
            {
                "fields": (
                    "last_modified_by",
                    "created_at",
                    "updated_at",
                )
            },
        ),
    )

    # HASH resumido
    def short_file_hash(self, obj):
        return obj.file_hash[:10] + "..." if obj.file_hash else "-"

    short_file_hash.short_description = "File Hash"

    def short_content_hash(self, obj):
        return obj.content_hash[:10] + "..." if obj.content_hash else "-"

    short_content_hash.short_description = "Content Hash"


# ============================================================
# 🟧 ADMIN DEL HISTORIAL (PRO)
# ============================================================


@admin.register(DocumentHistory)
class DocumentHistoryAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "document",
        "version_number",
        "event_type",
        "performed_by",
        "short_content_hash",
        "created_at",
    )

    list_filter = (
        "event_type",
        "version_number",
        "performed_by",
        "created_at",
    )

    search_fields = (
        "document__title",
        "document__project__name",
        "event_type",
        "performed_by__username",
    )

    readonly_fields = (
        "document",
        "version_number",
        "file_hash",
        "content_hash",
        "previous_hash",
        "event_type",
        "performed_by",
        "comment",
        "metadata_snapshot",
        "created_at",
    )

    def short_content_hash(self, obj):
        return obj.content_hash[:10] + "..." if obj.content_hash else "-"

    short_content_hash.short_description = "Hash"
