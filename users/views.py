from django.contrib.auth import authenticate
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from rest_framework_simplejwt.tokens import RefreshToken

from .serializers import UserSerializer, LoginSerializer, RegisterSerializer


class RegisterView(APIView):
    """
    Registro de usuario (admin o supervisor).
    Debe ser PÚBLICO (AllowAny).
    """

    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = serializer.save()

        # ⚠️ NO usamos log_action aquí para no romper la vista pública

        refresh = RefreshToken.for_user(user)

        return Response(
            {
                "user": UserSerializer(user).data,
                "access": str(refresh.access_token),
                "refresh": str(refresh),
            },
            status=status.HTTP_201_CREATED,
        )


class LoginView(APIView):
    """
    Login básico con username + password.
    También debe ser PÚBLICO (AllowAny).
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
                {"detail": "Credenciales inválidas"},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        if not user.is_active:
            return Response(
                {"detail": "Cuenta desactivada."},
                status=status.HTTP_403_FORBIDDEN,
            )

        # ⚠️ Otra vez, NO usamos log_action aquí

        refresh = RefreshToken.for_user(user)

        return Response(
            {
                "user": UserSerializer(user).data,
                "access": str(refresh.access_token),
                "refresh": str(refresh),
            },
            status=status.HTTP_200_OK,
        )


class MeView(APIView):
    """
    Devuelve el usuario autenticado.
    ESTA sí exige JWT.
    """

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data, status=status.HTTP_200_OK)
