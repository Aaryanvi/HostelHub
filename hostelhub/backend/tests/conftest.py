import pytest
from app import create_app
from config import Config


class TestConfig(Config):
    TESTING = True
    APP_ENV = "testing"
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"
    SECRET_KEY = "test-secret-key-for-unit-tests-only-1234567890"
    JWT_SECRET_KEY = "test-jwt-secret-key-for-unit-tests-only-1234567890"
    RATELIMIT_ENABLED = False
    ALLOWED_EMAIL_DOMAINS = []
    ADMIN_EMAILS = ["admin@college.edu"]


@pytest.fixture
def app(tmp_path):
    class Cfg(TestConfig):
        UPLOAD_FOLDER = str(tmp_path / "uploads")

    return create_app(Cfg)


@pytest.fixture
def client(app):
    return app.test_client()


@pytest.fixture
def make_user(client):
    """Register a user and return (auth_headers, user_dict)."""
    def _make(name="Test User", email="user@college.edu", password="secret123"):
        res = client.post("/api/auth/register", json={"name": name, "email": email, "password": password})
        assert res.status_code == 201, res.get_json()
        data = res.get_json()
        return {"Authorization": f"Bearer {data['token']}"}, data["user"]
    return _make


@pytest.fixture
def make_product(client):
    def _make(headers, **overrides):
        payload = {
            "title": "Casio Calculator",
            "description": "Barely used",
            "price": 500,
            "category": "Calculators",
            "condition": "Good",
        }
        payload.update(overrides)
        res = client.post("/api/products", json=payload, headers=headers)
        assert res.status_code == 201, res.get_json()
        return res.get_json()["product"]
    return _make
