from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)

urlpatterns = [
    path("admin/", admin.site.urls),
    # USERS (Auth)
    path("api/auth/", include("users.urls")),
    # CORE MODULES
    path("api/projects/", include("projects.urls")),
    path("api/purchases/", include("purchases.urls")),
    path("api/deliveries/", include("deliveries.urls")),
    path("api/progress/", include("progress_reports.urls")),
    path("api/documents/", include("documents.urls")),
    path("api/validation/", include("validation.urls")),
    path("api/alerts/", include("alerts.urls")),
    path("api/history/", include("history.urls")),
    path("api/market/", include("market.urls")),
    path("api/reporting/", include("reporting.urls")),
    path("api/search/", include("search.urls")),
    # JWT AUTH
    path("api/token/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("api/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
]

# MEDIA & STATIC FILES EN DESARROLLO
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
