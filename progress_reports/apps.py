from django.apps import AppConfig


class ProgressReportsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "progress_reports"

    def ready(self):
        import progress_reports.signals
