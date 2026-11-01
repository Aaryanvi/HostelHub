from app import create_app
from tests.conftest import TestConfig


def test_register_and_login(client):
    res = client.post("/api/auth/register", json={"name": "Ana", "email": "ana@college.edu", "password": "secret123"})
    assert res.status_code == 201
    assert "token" in res.get_json()
    assert "password_hash" not in res.get_json()["user"]

    res = client.post("/api/auth/login", json={"email": "ana@college.edu", "password": "secret123"})
    assert res.status_code == 200

    res = client.post("/api/auth/login", json={"email": "ana@college.edu", "password": "wrong"})
    assert res.status_code == 401


def test_duplicate_email_is_409(client, make_user):
    make_user(email="dup@college.edu")
    res = client.post("/api/auth/register", json={"name": "Other", "email": "DUP@college.edu", "password": "secret123"})
    assert res.status_code == 409


def test_register_validation(client):
    res = client.post("/api/auth/register", json={"name": "", "email": "nope", "password": "123"})
    assert res.status_code == 422
    fields = res.get_json()["fields"]
    assert {"name", "email", "password"} <= set(fields)


def test_me_requires_token(client):
    assert client.get("/api/auth/me").status_code == 401


def test_me_returns_current_user(client, make_user):
    headers, user = make_user()
    res = client.get("/api/auth/me", headers=headers)
    assert res.status_code == 200
    assert res.get_json()["user"]["email"] == user["email"]


def test_college_email_restriction(tmp_path):
    class Cfg(TestConfig):
        UPLOAD_FOLDER = str(tmp_path / "uploads")
        ALLOWED_EMAIL_DOMAINS = ["mycollege.edu"]

    client = create_app(Cfg).test_client()
    bad = client.post("/api/auth/register", json={"name": "A", "email": "a@gmail.com", "password": "secret123"})
    assert bad.status_code == 422
    assert "email" in bad.get_json()["fields"]
    good = client.post("/api/auth/register", json={"name": "A", "email": "a@mycollege.edu", "password": "secret123"})
    assert good.status_code == 201
    assert client.get("/api/auth/config").get_json()["allowed_email_domains"] == ["mycollege.edu"]
