from unittest.mock import patch

from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import AccessToken


User = get_user_model()


class CriticalMutationPermissionTests(APITestCase):
    list_endpoints = [
        "/api/projects/",
        "/api/purchases/",
        "/api/deliveries/",
        "/api/documents/",
        "/api/documents/upload/",
        "/api/progress/",
    ]

    detail_endpoints = [
        "/api/projects/999999/",
        "/api/purchases/999999/",
        "/api/deliveries/999999/",
        "/api/documents/999999/",
        "/api/progress/999999/",
    ]

    @classmethod
    def setUpTestData(cls):
        cls.admin = User.objects.create_user(
            username="permission_admin",
            password="test-password",
            role="admin",
        )
        cls.supervisor = User.objects.create_user(
            username="permission_supervisor",
            password="test-password",
            role="supervisor",
        )

    def authenticate(self, user):
        token = AccessToken.for_user(user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

    def test_supervisor_can_read_collections(self):
        self.authenticate(self.supervisor)

        for endpoint in self.list_endpoints:
            if endpoint.endswith("/upload/"):
                continue
            with self.subTest(endpoint=endpoint):
                response = self.client.get(endpoint)
                self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_supervisor_cannot_create(self):
        self.authenticate(self.supervisor)

        for endpoint in self.list_endpoints:
            with self.subTest(endpoint=endpoint):
                response = self.client.post(endpoint, {}, format="json")
                self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_supervisor_cannot_update(self):
        self.authenticate(self.supervisor)

        for endpoint in self.detail_endpoints:
            with self.subTest(endpoint=endpoint):
                response = self.client.patch(endpoint, {}, format="json")
                self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_supervisor_cannot_delete_supported_resources(self):
        self.authenticate(self.supervisor)

        for endpoint in [
            "/api/deliveries/999999/",
            "/api/documents/999999/",
        ]:
            with self.subTest(endpoint=endpoint):
                response = self.client.delete(endpoint)
                self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_is_allowed_to_reach_create_validation(self):
        self.authenticate(self.admin)

        for endpoint in self.list_endpoints:
            with self.subTest(endpoint=endpoint):
                response = self.client.post(endpoint, {}, format="json")
                self.assertNotEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class ReportingPermissionTests(APITestCase):
    endpoints = [
        (
            "/api/reporting/project/1/pdf/",
            "reporting.views.create_project_report_pdf",
        ),
        (
            "/api/reporting/alerts/1/pdf/",
            "reporting.views.create_alert_summary_pdf",
        ),
        (
            "/api/reporting/financial/1/pdf/",
            "reporting.views.create_financial_report_pdf",
        ),
    ]

    @classmethod
    def setUpTestData(cls):
        cls.admin = User.objects.create_user(
            username="report_admin",
            password="test-password",
            role="admin",
        )
        cls.supervisor = User.objects.create_user(
            username="report_supervisor",
            password="test-password",
            role="supervisor",
        )

    def authenticate(self, user):
        token = AccessToken.for_user(user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

    def test_reports_require_authentication(self):
        for endpoint, service_path in self.endpoints:
            with self.subTest(endpoint=endpoint), patch(
                service_path, return_value=b"%PDF"
            ):
                response = self.client.get(endpoint)
                self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_admin_and_supervisor_can_download_reports_with_jwt(self):
        for user in [self.admin, self.supervisor]:
            self.authenticate(user)
            for endpoint, service_path in self.endpoints:
                with self.subTest(role=user.role, endpoint=endpoint), patch(
                    service_path, return_value=b"%PDF"
                ):
                    response = self.client.get(endpoint)
                    self.assertEqual(response.status_code, status.HTTP_200_OK)
                    self.assertEqual(response["Content-Type"], "application/pdf")
