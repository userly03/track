from django.urls import path
from .views import LoginView, MeView, RegisterView
from rest_framework_simplejwt.views import TokenRefreshView  # ✔ necesario

urlpatterns = [
    path("login/", LoginView.as_view(), name="login"),
    path("me/", MeView.as_view(), name="me"),
    path("register/", RegisterView.as_view(), name="register"),
    # ✔ Refresh token disponible dentro de api/auth/
    path("refresh/", TokenRefreshView.as_view(), name="auth_token_refresh"),
]
