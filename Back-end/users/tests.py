from unittest.mock import patch

from django.test import override_settings
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from .models import SocialAccount, User


class AuthTests(APITestCase):
    def test_login_normal_sigue_funcionando(self):
        User.objects.create_user(
            username="normal",
            email="normal@example.com",
            password="secret123",
            role="supervisor",
        )

        response = self.client.post(
            reverse("login"),
            {"username": "normal", "password": "secret123"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("user", response.data)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)

    def test_refresh_sigue_funcionando(self):
        User.objects.create_user(
            username="refresh",
            email="refresh@example.com",
            password="secret123",
            role="supervisor",
        )
        login_response = self.client.post(
            reverse("login"),
            {"username": "refresh", "password": "secret123"},
            format="json",
        )

        response = self.client.post(
            reverse("auth_token_refresh"),
            {"refresh": login_response.data["refresh"]},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)

    @override_settings(GOOGLE_CLIENT_ID="client-id")
    @patch("users.views.google_id_token.verify_oauth2_token")
    def test_google_login_rechaza_token_invalido(self, verify_token):
        verify_token.side_effect = Exception("invalid token")

        response = self.client.post(
            reverse("google_login"),
            {"id_token": "bad-token"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    @override_settings(GOOGLE_CLIENT_ID="client-id")
    @patch("users.views.google_id_token.verify_oauth2_token")
    def test_google_login_rechaza_email_no_verificado(self, verify_token):
        verify_token.return_value = {
            "sub": "google-sub-1",
            "email": "oauth@example.com",
            "email_verified": False,
        }

        response = self.client.post(
            reverse("google_login"),
            {"id_token": "token"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    @override_settings(GOOGLE_CLIENT_ID="client-id")
    @patch("users.views.google_id_token.verify_oauth2_token")
    def test_google_login_crea_usuario_y_cuenta_social(self, verify_token):
        verify_token.return_value = {
            "sub": "google-sub-2",
            "email": "new-google@example.com",
            "email_verified": True,
            "given_name": "New",
            "family_name": "Google",
            "name": "New Google",
        }

        response = self.client.post(
            reverse("google_login"),
            {"id_token": "token"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)
        user = User.objects.get(email="new-google@example.com")
        self.assertEqual(user.role, "supervisor")
        self.assertTrue(user.has_usable_password() is False)
        self.assertTrue(
            SocialAccount.objects.filter(
                user=user,
                provider=SocialAccount.PROVIDER_GOOGLE,
                provider_user_id="google-sub-2",
            ).exists()
        )

    @override_settings(GOOGLE_CLIENT_ID="client-id")
    @patch("users.views.google_id_token.verify_oauth2_token")
    def test_google_login_vincula_usuario_existente_por_email(self, verify_token):
        user = User.objects.create_user(
            username="existing",
            email="existing@example.com",
            password="secret123",
            role="supervisor",
        )
        verify_token.return_value = {
            "sub": "google-sub-3",
            "email": "existing@example.com",
            "email_verified": True,
        }

        response = self.client.post(
            reverse("google_login"),
            {"id_token": "token"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(User.objects.filter(email="existing@example.com").count(), 1)
        self.assertTrue(
            SocialAccount.objects.filter(user=user, provider_user_id="google-sub-3").exists()
        )

    def test_logout_invalida_refresh_token(self):
        User.objects.create_user(
            username="logout",
            email="logout@example.com",
            password="secret123",
            role="supervisor",
        )
        login_response = self.client.post(
            reverse("login"),
            {"username": "logout", "password": "secret123"},
            format="json",
        )
        refresh = login_response.data["refresh"]

        logout_response = self.client.post(
            reverse("logout"),
            {"refresh": refresh},
            format="json",
        )
        refresh_response = self.client.post(
            reverse("auth_token_refresh"),
            {"refresh": refresh},
            format="json",
        )

        self.assertEqual(logout_response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(refresh_response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_usuario_no_puede_registrarse_como_admin(self):
        response = self.client.post(
            reverse("register"),
            {
                "username": "public-user",
                "email": "public@example.com",
                "password": "secret123",
                "role": "admin",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["user"]["role"], "supervisor")
