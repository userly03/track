from rest_framework import serializers
from .models import User


class UserSerializer(serializers.ModelSerializer):
    """
    Serializador principal del usuario.
    Se usa en login, /me/, auditoria, validaciones, documentos y reportes.
    """

    class Meta:
        model = User
        fields = ["id", "username", "email", "role", "digital_signature"]
        read_only_fields = ["id", "digital_signature"]


class LoginSerializer(serializers.Serializer):
    """
    Login basico para autenticacion.
    """

    username = serializers.CharField()
    password = serializers.CharField(write_only=True)


class RegisterSerializer(serializers.ModelSerializer):
    """
    Registro publico con rol seguro definido por el backend.
    """

    password = serializers.CharField(write_only=True, min_length=8)
    role = serializers.CharField(read_only=True)

    class Meta:
        model = User
        fields = ["id", "username", "email", "password", "role"]
        read_only_fields = ["id", "role"]

    def validate_email(self, value):
        """
        Evita correos duplicados en el sistema.
        """
        if value and User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("Este email ya esta registrado.")
        return value

    def create(self, validated_data):
        password = validated_data.pop("password")
        validated_data["role"] = "supervisor"
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user


class GoogleLoginSerializer(serializers.Serializer):
    id_token = serializers.CharField(write_only=True)


class LogoutSerializer(serializers.Serializer):
    refresh = serializers.CharField(write_only=True)
