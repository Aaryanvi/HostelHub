from flask import Blueprint, request
from werkzeug.security import generate_password_hash, check_password_hash
from flask_jwt_extended import create_access_token

from ..extensions import db
from ..models import User


auth_bp = Blueprint(
    "auth",
    __name__,
    url_prefix="/api/auth"
)


# ==========================================
# REGISTER
# ==========================================

@auth_bp.route("/register", methods=["POST"])
def register():

    data = request.get_json()

    # Check required fields
    required_fields = [
        "name",
        "email",
        "password",
        "hostel",
        "branch",
        "year"
    ]

    for field in required_fields:

        if field not in data:
            return {
                "message": f"{field} is required"
            }, 400

    # Check whether email already exists
    existing_user = User.query.filter_by(
        email=data["email"]
    ).first()

    if existing_user:
        return {
            "message": "Email already registered"
        }, 409

    # Hash password
    hashed_password = generate_password_hash(
        data["password"]
    )

    # Create new user
    user = User(
        name=data["name"],
        email=data["email"],
        password=hashed_password,
        phone=data.get("phone"),
        hostel=data["hostel"],
        branch=data["branch"],
        year=data["year"]
    )

    # Save user
    db.session.add(user)
    db.session.commit()

    return {
        "message": "User registered successfully",
        "user": {
            "id": user.id,
            "name": user.name,
            "email": user.email
        }
    }, 201


# ==========================================
# LOGIN
# ==========================================

@auth_bp.route("/login", methods=["POST"])
def login():

    data = request.get_json()

    # Get email and password
    email = data.get("email")
    password = data.get("password")

    # Check whether both fields are provided
    if not email or not password:
        return {
            "message": "Email and password are required"
        }, 400

    # Find user by email
    user = User.query.filter_by(
        email=email
    ).first()

    # User does not exist
    if not user:
        return {
            "message": "Invalid email or password"
        }, 401

    # Check password
    if not check_password_hash(
        user.password,
        password
    ):
        return {
            "message": "Invalid email or password"
        }, 401

    # Generate JWT token
    access_token = create_access_token(
        identity=str(user.id)
    )

    # Return successful login response
    return {
        "message": "Login successful",
        "access_token": access_token,
        "user": {
            "id": user.id,
            "name": user.name,
            "email": user.email
        }
    }, 200