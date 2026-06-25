from django.conf import settings
from django.db import migrations, models
from django.db.models import Count, Q
from django.db.models.functions import Lower


def ensure_no_duplicate_non_empty_emails(apps, schema_editor):
    User = apps.get_model("users", "User")
    duplicates = (
        User.objects.exclude(email="")
        .annotate(email_lower=Lower("email"))
        .values("email_lower")
        .annotate(total=Count("id"))
        .filter(total__gt=1)
    )

    if duplicates.exists():
        duplicate_values = ", ".join(str(item["email_lower"]) for item in duplicates[:10])
        raise RuntimeError(
            "No se puede aplicar la restriccion unique de email: "
            f"existen emails duplicados: {duplicate_values}. "
            "Corrige los duplicados y vuelve a ejecutar migrate."
        )


class Migration(migrations.Migration):

    dependencies = [
        ("users", "0002_alter_user_role"),
    ]

    operations = [
        migrations.RunPython(
            ensure_no_duplicate_non_empty_emails,
            reverse_code=migrations.RunPython.noop,
        ),
        migrations.CreateModel(
            name="SocialAccount",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                (
                    "provider",
                    models.CharField(
                        choices=[("google", "Google")],
                        max_length=50,
                    ),
                ),
                ("provider_user_id", models.CharField(max_length=255)),
                ("email", models.EmailField(max_length=254)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "user",
                    models.ForeignKey(
                        on_delete=models.deletion.CASCADE,
                        related_name="social_accounts",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
        ),
        migrations.AddConstraint(
            model_name="user",
            constraint=models.UniqueConstraint(
                Lower("email"),
                condition=~Q(email=""),
                name="unique_non_empty_user_email_ci",
            ),
        ),
        migrations.AddConstraint(
            model_name="socialaccount",
            constraint=models.UniqueConstraint(
                fields=("provider", "provider_user_id"),
                name="unique_social_provider_user_id",
            ),
        ),
    ]
