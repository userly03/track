from django.conf import settings
from django.contrib.auth import authenticate
from django.db import transaction
from django.utils.text import slugify
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenRefreshView

from google.auth.transport import requests as google_requests
from google.oauth2 import id_token as google_id_token

from .models import SocialAccount, User
from .serializers import (
    GoogleLoginSerializer,
    LoginSerializer,
    LogoutSerializer,
    RegisterSerializer,
    UserSerializer,
)


def _token_response(user, response_status=status.HTTP_200_OK):
    refresh = RefreshToken.for_user(user)
    return Response(
        {
            "user": UserSerializer(user).data,
            "access": str(refresh.access_token),
            "refresh": str(refresh),
        },
        status=response_status,
    )


def _unique_username_from_google(payload):
    base = (
        payload.get("email", "").split("@")[0]
        or payload.get("name")
        or payload.get("given_name")
        or f"google_{payload.get('sub', '')[:12]}"
    )
    base = slugify(base).replace("-", "_")[:140] or "google_user"
    username = base
    counter = 1

    while User.objects.filter(username=username).exists():
        suffix = f"_{counter}"
        username = f"{base[:150 - len(suffix)]}{suffix}"
        counter += 1

    return username


def _verify_google_token(raw_id_token):
    if not settings.GOOGLE_CLIENT_ID:
        raise ValueError("Google Login no esta configurado.")

    return google_id_token.verify_oauth2_token(
        raw_id_token,
        google_requests.Request(),
        settings.GOOGLE_CLIENT_ID,
    )


class RegisterView(APIView):
    """
    Registro publico. El rol lo define el backend, no el cliente.
    """

    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = serializer.save()
        return _token_response(user, status.HTTP_201_CREATED)


class LoginView(APIView):
    """
    Login basico con username + password.
    """

    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        username = serializer.validated_data["username"]
        password = serializer.validated_data["password"]

        user = authenticate(username=username, password=password)

        if not user:
            return Response(
                {"detail": "Credenciales invalidas"},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        if not user.is_active:
            return Response(
                {"detail": "Cuenta desactivada."},
                status=status.HTTP_403_FORBIDDEN,
            )

        return _token_response(user)


class GoogleLoginView(APIView):
    """
    Login con Google OAuth como proveedor de identidad y JWT como sesion API.
    """

    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = GoogleLoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            payload = _verify_google_token(serializer.validated_data["id_token"])
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception:
            return Response(
                {"detail": "Token de Google invalido."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        if not payload.get("email_verified"):
            return Response(
                {"detail": "El correo de Google no esta verificado."},
                status=status.HTTP_403_FORBIDDEN,
            )

        provider_user_id = payload.get("sub")
        email = payload.get("email")

        if not provider_user_id or not email:
            return Response(
                {"detail": "El token de Google no incluye sub/email."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        with transaction.atomic():
            social_account = SocialAccount.objects.select_related("user").filter(
                provider=SocialAccount.PROVIDER_GOOGLE,
                provider_user_id=provider_user_id,
            ).first()

            if social_account:
                user = social_account.user
            else:
                user = User.objects.filter(email__iexact=email).order_by("id").first()
                if user is None:
                    user = User(
                        username=_unique_username_from_google(payload),
                        email=email,
                        first_name=payload.get("given_name", "")[:150],
                        last_name=payload.get("family_name", "")[:150],
                        role="supervisor",
                    )
                    user.set_unusable_password()
                    user.save()

                SocialAccount.objects.create(
                    user=user,
                    provider=SocialAccount.PROVIDER_GOOGLE,
                    provider_user_id=provider_user_id,
                    email=email,
                )

        if not user.is_active:
            return Response(
                {"detail": "Cuenta desactivada."},
                status=status.HTTP_403_FORBIDDEN,
            )

        return _token_response(user)


class LogoutView(APIView):
    """
    Revoca un refresh token de SimpleJWT.
    """

    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = LogoutSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            token = RefreshToken(serializer.validated_data["refresh"])
            token.blacklist()
        except TokenError:
            return Response(
                {"detail": "Refresh token invalido."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(status=status.HTTP_204_NO_CONTENT)


class MeView(APIView):
    """
    Devuelve el usuario autenticado.
    """

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data, status=status.HTTP_200_OK)


class PublicTokenRefreshView(TokenRefreshView):
    permission_classes = [permissions.AllowAny]
