from django.urls import path

from .views import (
    GoogleLoginView,
    LoginView,
    LogoutView,
    MeView,
    PublicTokenRefreshView,
    RegisterView,
)

urlpatterns = [
    path("login/", LoginView.as_view(), name="login"),
    path("google/", GoogleLoginView.as_view(), name="google_login"),
    path("logout/", LogoutView.as_view(), name="logout"),
    path("me/", MeView.as_view(), name="me"),
    path("register/", RegisterView.as_view(), name="register"),
    path("refresh/", PublicTokenRefreshView.as_view(), name="auth_token_refresh"),
]
