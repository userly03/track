import json
from datetime import date, timedelta
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import AccessToken

from alerts.models import Alert
from documents.models import Document, DocumentHistory
from projects.models import Project
from purchases.models import Purchase
from validation.models import ValidationItem, ValidationRecord


User = get_user_model()


class FunctionalContractTests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.admin = User.objects.create_user(
            username="functional_admin",
            password="test-password",
            role="admin",
        )
        cls.supervisor = User.objects.create_user(
            username="functional_supervisor",
            password="test-password",
            role="supervisor",
        )
        cls.project = Project.objects.create(
            code="FUNC-001",
            name="Functional project",
            location="Lima",
            start_date=date.today() - timedelta(days=30),
            end_date_estimated=date.today() + timedelta(days=30),
            status="active",
            created_by=cls.admin,
            updated_by=cls.admin,
        )

    def authenticate(self, user):
        token = AccessToken.for_user(user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

    def test_document_update_accepts_json_patch(self):
        document = Document.objects.create(
            project=self.project,
            title="Original title",
            description="Original description",
            file=SimpleUploadedFile("contract.pdf", b"%PDF-1.4 test"),
            uploaded_by=self.admin,
            updated_by=self.admin,
        )
        self.authenticate(self.admin)

        response = self.client.patch(
            f"/api/documents/{document.id}/",
            {"title": "Updated title"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["title"], "Updated title")

    def test_document_versions_include_data_needed_by_frontend_adapter(self):
        document = Document.objects.create(
            project=self.project,
            title="Versioned document",
            file=SimpleUploadedFile("version.pdf", b"%PDF-1.4 version"),
            version_number=1,
            uploaded_by=self.admin,
            updated_by=self.admin,
        )
        self.authenticate(self.supervisor)

        response = self.client.get(f"/api/documents/{document.id}/versions/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["current_version"], 1)
        self.assertEqual(response.data["versions"][0]["version"], 1)
        self.assertIn("created_at", response.data["versions"][0])

    def test_document_history_exposes_backend_contract_for_adapter(self):
        document = Document.objects.create(
            project=self.project,
            title="History document",
            file=SimpleUploadedFile("history.pdf", b"%PDF-1.4 history"),
            uploaded_by=self.admin,
            updated_by=self.admin,
        )
        DocumentHistory.objects.create(
            document=document,
            version_number=1,
            event_type="created",
            performed_by=self.admin,
            metadata_snapshot={"source": "test"},
        )
        self.authenticate(self.supervisor)

        response = self.client.get(f"/api/documents/{document.id}/history/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data[0]["version_number"], 1)
        self.assertEqual(response.data[0]["event_type"], "created")
        self.assertEqual(response.data[0]["performedBy"], self.admin.username)

    def test_validation_action_returns_complete_item(self):
        purchase = Purchase.objects.create(
            project=self.project,
            item_name="Cement",
            quantity=2,
            unit_price=10,
            supplier="Supplier",
            created_by=self.admin,
            updated_by=self.admin,
        )
        item = ValidationItem.objects.filter(purchase=purchase).first()
        if item is None:
            item = ValidationItem.objects.create(type="purchase", purchase=purchase)

        def apply_approval(*, item_id, user, decision, comment):
            target = ValidationItem.objects.get(id=item_id)
            target.status = "approved"
            target.approvals_count = 1
            target.validated_by = user
            target.save()
            ValidationRecord.objects.create(
                validation_item=target,
                validator=user,
                validator_role=user.role,
                decision=decision,
                comment=comment,
            )

        self.authenticate(self.supervisor)
        with patch(
            "validation.views.add_validation_action",
            side_effect=apply_approval,
        ):
            response = self.client.post(
                f"/api/validation/{item.id}/approve/",
                {"comment": "Approved"},
                format="json",
            )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["id"], item.id)
        self.assertEqual(response.data["status"], "approved")
        self.assertEqual(response.data["approvals_count"], 1)
        self.assertEqual(len(response.data["records"]), 1)

    def test_alert_resolve_returns_flat_alert(self):
        alert = Alert.objects.create(
            project=self.project,
            item_type="system",
            item_id=999,
            title="Functional alert",
            message="Alert created for contract testing",
            severity="warning",
        )
        self.authenticate(self.admin)

        response = self.client.patch(
            f"/api/alerts/{alert.id}/resolve/",
            {"status": "resolved"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["id"], alert.id)
        self.assertEqual(response.data["status"], "resolved")
        self.assertIsNotNone(response.data["resolved_at"])
        self.assertNotIn("alert", response.data)

    def test_search_accepts_grouped_advanced_filters(self):
        Project.objects.create(
            code="FUNC-PAUSED",
            name="Paused project",
            location="Lima",
            start_date=date.today() - timedelta(days=30),
            end_date_estimated=date.today() + timedelta(days=30),
            status="paused",
            created_by=self.admin,
            updated_by=self.admin,
        )
        self.authenticate(self.supervisor)

        response = self.client.get(
            "/api/search/",
            {
                "q": "",
                "filters": json.dumps(
                    {"projects": {"status": "active", "code": "FUNC-001"}}
                ),
            },
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        payload = response.json()
        project_results = [
            result for result in payload["results"] if result["type"] == "project"
        ]
        self.assertEqual(len(project_results), 1)
        self.assertEqual(project_results[0]["project_code"], "FUNC-001")
