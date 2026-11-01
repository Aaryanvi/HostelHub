import os
from datetime import timedelta

BASE_DIR = os.path.abspath(os.path.dirname(__file__))

DEFAULT_SECRET = "dev-secret-change-in-production"
DEFAULT_JWT_SECRET = "dev-jwt-secret-change-in-production"


def _csv(name):
    """Read a comma-separated env var into a lowercase list."""
    return [v.strip().lower() for v in os.environ.get(name, "").split(",") if v.strip()]


def _database_url():
    url = os.environ.get("DATABASE_URL")
    if not url:
        return "sqlite:///" + os.path.join(BASE_DIR, "hostelhub.db")
    # Some hosts (Heroku/Render) still hand out the old "postgres://" scheme.
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql://", 1)
    return url


class Config:
    APP_ENV = os.environ.get("APP_ENV", "development")

    SECRET_KEY = os.environ.get("SECRET_KEY", DEFAULT_SECRET)
    JWT_SECRET_KEY = os.environ.get("JWT_SECRET_KEY", DEFAULT_JWT_SECRET)
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(days=7)

    SQLALCHEMY_DATABASE_URI = _database_url()
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    CORS_ORIGINS = [
        o.strip()
        for o in os.environ.get("CORS_ORIGINS", "http://localhost:5173").split(",")
        if o.strip()
    ]

    MAX_CONTENT_LENGTH = 5 * 1024 * 1024  # 5MB per request (image uploads)
    UPLOAD_FOLDER = os.environ.get("UPLOAD_FOLDER", os.path.join(BASE_DIR, "uploads"))

    # Leave ALLOWED_EMAIL_DOMAINS empty in development to allow any email.
    # In production set e.g. ALLOWED_EMAIL_DOMAINS=mycollege.edu.in
    ALLOWED_EMAIL_DOMAINS = _csv("ALLOWED_EMAIL_DOMAINS")

    # Accounts with these emails can open the /admin moderation page.
    ADMIN_EMAILS = _csv("ADMIN_EMAILS")

    RATELIMIT_ENABLED = True
    RATELIMIT_STORAGE_URI = os.environ.get("RATELIMIT_STORAGE_URI", "memory://")
