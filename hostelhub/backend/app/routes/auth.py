import re
from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from app.extensions import db, limiter
from app.models import User

auth_bp = Blueprint("auth", __name__)

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def _s(value):
    """Safe string: returns a stripped string, or '' if the value isn't text."""
    return value.strip() if isinstance(value, str) else ""


def validate_register_payload(data):
    errors = {}

    name = _s(data.get("name"))
    email = _s(data.get("email")).lower()
    password = data.get("password") if isinstance(data.get("password"), str) else ""

    if not name:
        errors["name"] = "Name is required."
    elif len(name) > 120:
        errors["name"] = "Name is too long."

    if not email or not EMAIL_RE.match(email):
        errors["email"] = "Enter a valid email address."
    else:
        domains = current_app.config.get("ALLOWED_EMAIL_DOMAINS", [])
        if domains and email.rsplit("@", 1)[1] not in domains:
            errors["email"] = "Please use your college email (" + ", ".join("@" + d for d in domains) + ")."

    if len(password) < 6:
        errors["password"] = "Password must be at least 6 characters."
    elif len(password) > 128:
        errors["password"] = "Password is too long."

    return errors


@auth_bp.route("/config", methods=["GET"])
def auth_config():
    """Public settings the register page needs (e.g. which college domains are allowed)."""
    return jsonify({"allowed_email_domains": current_app.config.get("ALLOWED_EMAIL_DOMAINS", [])}), 200


@auth_bp.route("/register", methods=["POST"])
@limiter.limit("30 per hour")
def register():
    data = request.get_json(silent=True) or {}
    errors = validate_register_payload(data)
    if errors:
        return jsonify({"error": "Please fix the errors below.", "fields": errors}), 422

    email = _s(data["email"]).lower()

    if User.query.filter_by(email=email).first():
        return jsonify({"error": "An account with this email already exists.", "fields": {"email": "Email already registered."}}), 409

    user = User(
        name=_s(data["name"]),
        email=email,
        phone=_s(data.get("phone"))[:20] or None,
        hostel=_s(data.get("hostel"))[:100] or None,
        branch=_s(data.get("branch"))[:100] or None,
        year=_s(data.get("year"))[:20] or None,
    )
    user.set_password(data["password"])

    db.session.add(user)
    db.session.commit()

    token = create_access_token(identity=str(user.id))
    return jsonify({"token": token, "user": user.to_dict()}), 201


@auth_bp.route("/login", methods=["POST"])
@limiter.limit("10 per minute")
def login():
    data = request.get_json(silent=True) or {}
    email = _s(data.get("email")).lower()
    password = data.get("password") if isinstance(data.get("password"), str) else ""

    if not email or not password:
        return jsonify({"error": "Email and password are required."}), 422

    user = User.query.filter_by(email=email).first()

    if not user or not user.check_password(password):
        return jsonify({"error": "Invalid email or password."}), 401

    token = create_access_token(identity=str(user.id))
    return jsonify({"token": token, "user": user.to_dict()}), 200


@auth_bp.route("/me", methods=["GET"])
@jwt_required()
def me():
    user = db.session.get(User, int(get_jwt_identity()))
    if not user:
        return jsonify({"error": "User not found."}), 404
    return jsonify({"user": user.to_dict()}), 200


@auth_bp.route("/profile", methods=["PUT"])
@jwt_required()
def update_profile():
    user = db.session.get(User, int(get_jwt_identity()))
    if not user:
        return jsonify({"error": "User not found."}), 404

    data = request.get_json(silent=True) or {}

    name = _s(data.get("name"))
    if name:
        user.name = name[:120]

    limits = {"phone": 20, "hostel": 100, "branch": 100, "year": 20}
    for field, limit in limits.items():
        if field in data:
            setattr(user, field, _s(data.get(field))[:limit] or None)

    db.session.commit()
    return jsonify({"user": user.to_dict()}), 200
