import math
import statistics
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, verify_jwt_in_request
from app.extensions import db
from app.models import Product, delete_product_cascade

products_bp = Blueprint("products", __name__)

ALLOWED_CATEGORIES = {
    "Textbooks", "Electronics", "Calculators", "Stationery",
    "Hostel Items", "Furniture", "Clothing", "Accessories", "Cycles", "Other",
}
ALLOWED_CONDITIONS = {"New", "Like New", "Good", "Fair", "Worn"}
MAX_PRICE = 10_000_000
DEFAULT_PER_PAGE = 12
MAX_PER_PAGE = 50


def get_optional_user_id():
    """Return the requester's user id if a valid JWT is present, else None."""
    try:
        verify_jwt_in_request(optional=True)
        identity = get_jwt_identity()
        return int(identity) if identity else None
    except Exception:
        return None


@products_bp.route("", methods=["GET"])
def list_products():
    current_user_id = get_optional_user_id()

    query = Product.query.filter_by(status="available")

    search = request.args.get("search", "").strip()
    if search:
        like = f"%{search}%"
        query = query.filter(
            db.or_(Product.title.ilike(like), Product.description.ilike(like))
        )

    category = request.args.get("category", "").strip()
    if category and category != "All":
        query = query.filter(Product.category == category)

    condition = request.args.get("condition", "").strip()
    if condition and condition != "All":
        query = query.filter(Product.condition == condition)

    min_price = request.args.get("min_price", type=float)
    if min_price is not None:
        query = query.filter(Product.price >= min_price)

    max_price = request.args.get("max_price", type=float)
    if max_price is not None:
        query = query.filter(Product.price <= max_price)

    # Secondary sort on id keeps pagination stable when values tie.
    sort = request.args.get("sort", "newest")
    if sort == "price_asc":
        query = query.order_by(Product.price.asc(), Product.id.desc())
    elif sort == "price_desc":
        query = query.order_by(Product.price.desc(), Product.id.desc())
    else:
        query = query.order_by(Product.created_at.desc(), Product.id.desc())

    total = query.count()

    per_page = request.args.get("per_page", type=int) or request.args.get("limit", type=int) or DEFAULT_PER_PAGE
    per_page = max(1, min(per_page, MAX_PER_PAGE))
    page = max(1, request.args.get("page", default=1, type=int) or 1)

    products = query.offset((page - 1) * per_page).limit(per_page).all()

    return jsonify({
        "products": [p.to_dict(current_user_id) for p in products],
        "count": total,
        "page": page,
        "per_page": per_page,
        "has_more": page * per_page < total,
    }), 200


@products_bp.route("/price-suggestion", methods=["GET"])
def price_suggestion():
    """Price range of similar listings (same category, and condition if given)."""
    category = request.args.get("category", "").strip()
    condition = request.args.get("condition", "").strip()

    if category not in ALLOWED_CATEGORIES:
        return jsonify({"error": "Select a valid category."}), 422

    query = Product.query.filter_by(category=category)
    if condition in ALLOWED_CONDITIONS:
        query = query.filter_by(condition=condition)

    prices = [row[0] for row in query.with_entities(Product.price).all()]

    # Don't show a "suggestion" based on one or two listings.
    if len(prices) < 3:
        return jsonify({"suggestion": None, "count": len(prices)}), 200

    return jsonify({
        "suggestion": {
            "count": len(prices),
            "min": min(prices),
            "max": max(prices),
            "median": statistics.median(prices),
        }
    }), 200


@products_bp.route("/<int:product_id>", methods=["GET"])
def get_product(product_id):
    current_user_id = get_optional_user_id()
    product = db.session.get(Product, product_id)

    if not product:
        return jsonify({"error": "Product not found."}), 404

    return jsonify({"product": product.to_dict(current_user_id)}), 200


def validate_product_payload(data, partial=False):
    errors = {}

    if not partial or "title" in data:
        title = data.get("title")
        if not isinstance(title, str) or not title.strip():
            errors["title"] = "Title is required."
        elif len(title.strip()) > 150:
            errors["title"] = "Title must be under 150 characters."

    if "description" in data or not partial:
        description = data.get("description", "")
        if description is not None and not isinstance(description, str):
            errors["description"] = "Description must be text."
        elif isinstance(description, str) and len(description) > 2000:
            errors["description"] = "Description must be under 2000 characters."

    if not partial or "price" in data:
        try:
            price_val = float(data.get("price"))
            if not math.isfinite(price_val) or price_val < 0:
                errors["price"] = "Enter a valid price."
            elif price_val > MAX_PRICE:
                errors["price"] = "Price is too high."
        except (TypeError, ValueError):
            errors["price"] = "Enter a valid price."

    if not partial or "category" in data:
        if data.get("category") not in ALLOWED_CATEGORIES:
            errors["category"] = "Select a valid category."

    if not partial or "condition" in data:
        if data.get("condition") not in ALLOWED_CONDITIONS:
            errors["condition"] = "Select a valid condition."

    if not partial or "image" in data:
        image = data.get("image") or ""
        if not isinstance(image, str):
            errors["image"] = "Invalid image."
        else:
            image = image.strip()
            if image and not image.startswith(("/uploads/", "http://", "https://")):
                errors["image"] = "Image must be an uploaded file or a valid http(s) link."
            elif len(image) > 500:
                errors["image"] = "Image link is too long."

    return errors


@products_bp.route("", methods=["POST"])
@jwt_required()
def create_product():
    user_id = int(get_jwt_identity())
    data = request.get_json(silent=True) or {}

    errors = validate_product_payload(data)
    if errors:
        return jsonify({"error": "Please fix the errors below.", "fields": errors}), 422

    product = Product(
        title=data["title"].strip(),
        description=(data.get("description") or "").strip(),
        price=float(data["price"]),
        category=data["category"],
        condition=data["condition"],
        image=(data.get("image") or "").strip() or None,
        seller_id=user_id,
    )

    db.session.add(product)
    db.session.commit()

    return jsonify({"product": product.to_dict(user_id)}), 201


@products_bp.route("/<int:product_id>", methods=["PUT"])
@jwt_required()
def update_product(product_id):
    user_id = int(get_jwt_identity())
    product = db.session.get(Product, product_id)

    if not product:
        return jsonify({"error": "Product not found."}), 404

    if product.seller_id != user_id:
        return jsonify({"error": "You can only edit your own listings."}), 403

    data = request.get_json(silent=True) or {}
    errors = validate_product_payload(data, partial=True)
    if errors:
        return jsonify({"error": "Please fix the errors below.", "fields": errors}), 422

    if "title" in data:
        product.title = data["title"].strip()
    if "description" in data:
        product.description = (data["description"] or "").strip()
    if "price" in data:
        product.price = float(data["price"])
    if "category" in data:
        product.category = data["category"]
    if "condition" in data:
        product.condition = data["condition"]
    if "image" in data:
        product.image = (data.get("image") or "").strip() or None
    if "status" in data and data["status"] in ("available", "sold"):
        product.status = data["status"]

    db.session.commit()

    return jsonify({"product": product.to_dict(user_id)}), 200


@products_bp.route("/<int:product_id>", methods=["DELETE"])
@jwt_required()
def delete_product(product_id):
    user_id = int(get_jwt_identity())
    product = db.session.get(Product, product_id)

    if not product:
        return jsonify({"error": "Product not found."}), 404

    if product.seller_id != user_id:
        return jsonify({"error": "You can only delete your own listings."}), 403

    delete_product_cascade(product)
    db.session.commit()

    return jsonify({"message": "Product deleted."}), 200


@products_bp.route("/mine", methods=["GET"])
@jwt_required()
def my_products():
    user_id = int(get_jwt_identity())
    products = (
        Product.query.filter_by(seller_id=user_id)
        .order_by(Product.created_at.desc(), Product.id.desc())
        .all()
    )
    return jsonify({
        "products": [p.to_dict(user_id) for p in products],
        "count": len(products),
    }), 200


@products_bp.route("/categories", methods=["GET"])
def categories():
    return jsonify({"categories": sorted(ALLOWED_CATEGORIES)}), 200
