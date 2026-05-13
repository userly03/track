from pathlib import Path
import os
from datetime import timedelta
import dj_database_url
from dotenv import load_dotenv

# ============================================================
# BASE CONFIG
# ============================================================

BASE_DIR = Path(__file__).resolve().parent.parent

# Cargar variables del archivo .env
load_dotenv(BASE_DIR / ".env")

# SECRET KEY desde .env
SECRET_KEY = os.getenv("SECRET_KEY", "fallback-secret-key-if-missing")

# DEBUG
DEBUG = os.getenv("DEBUG", "False") == "True"

# Para Docker, frontend y móviles
ALLOWED_HOSTS = ["*"]


# ============================================================
# APPS
# ============================================================

INSTALLED_APPS = [
    # Django Core
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    # Third-party
    "rest_framework",
    "rest_framework_simplejwt",
    "corsheaders",
    "django_filters",
    "django_extensions",
    # Internal Apps
    "users",
    "projects",
    "purchases",
    "deliveries",
    "progress_reports",
    "documents",
    "validation",
    "alerts",
    "history",
    "market",
    "reporting",
]


# ============================================================
# MIDDLEWARE
# ============================================================

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "trackbuild.urls"
AUTH_USER_MODEL = "users.User"

# CORS
CORS_ALLOW_ALL_ORIGINS = True
CORS_ALLOW_CREDENTIALS = True


# ============================================================
# TEMPLATES
# ============================================================

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "trackbuild" / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "trackbuild.wsgi.application"


# ============================================================
# DATABASE CONFIG (DOCKER READY)
# ============================================================

DATABASES = {"default": dj_database_url.config(default=os.getenv("DATABASE_URL"))}


# ============================================================
# PASSWORD VALIDATION
# ============================================================

AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"
    },
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]


# ============================================================
# INTERNATIONALIZATION
# ============================================================

LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True


# ============================================================
# STATIC & MEDIA
# ============================================================

STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"

MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"


# ============================================================
# REST FRAMEWORK + JWT
# ============================================================

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(hours=3),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "AUTH_HEADER_TYPES": ("Bearer",),
}


# ============================================================
# DJANGO CONFIG
# ============================================================

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

CORS_ALLOW_HEADERS = [
    "accept",
    "accept-encoding",
    "authorization",
    "content-type",
    "origin",
    "user-agent",
    "dnt",
    "cache-control",
    "x-requested-with",
]

CORS_EXPOSE_HEADERS = ["Authorization"]
