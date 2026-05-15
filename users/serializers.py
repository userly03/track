from rest_framework import serializers
from .models import User


class UserSerializer(serializers.ModelSerializer):
    """
    Serializador principal del usuario.
    Se usa en login, /me/, auditoría, validaciones, documentos y reportes.
    """

    class Meta:
        model = User
        fields = ["id", "username", "email", "role", "digital_signature"]
        read_only_fields = ["id", "digital_signature"]


class LoginSerializer(serializers.Serializer):
    """
    Login básico para autenticación.
    """

    username = serializers.CharField()
    password = serializers.CharField(write_only=True)


class RegisterSerializer(serializers.ModelSerializer):
    """
    Registro para crear usuarios admin o supervisor.
    La firma digital se genera automáticamente desde models.save().
    """

    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = ["id", "username", "email", "password", "role"]

    def validate_role(self, value):
        """
        Asegura que el rol sea uno de los permitidos.
        """
        if value not in ["admin", "supervisor"]:
            raise serializers.ValidationError("Rol inválido.")
        return value

    def validate_email(self, value):
        """
        Evita correos duplicados en el sistema.
        """
        if value and User.objects.filter(email=value).exists():
            raise serializers.ValidationError("Este email ya está registrado.")
        return value

    def create(self, validated_data):
        password = validated_data.pop("password")
        user = User(**validated_data)
        user.set_password(password)  # aplica hash a la contraseña
        user.save()  # genera firma digital automáticamente
        return user
