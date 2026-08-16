from flask import Blueprint, request
from flask_jwt_extended import jwt_required, get_jwt_identity

from ..extensions import db
from ..models import Product


products_bp = Blueprint(
    "products",
    __name__,
    url_prefix="/api/products"
)


# ==========================================
# GET ALL PRODUCTS
# ==========================================

@products_bp.route("", methods=["GET"])
def get_products():

    products = Product.query.order_by(
        Product.created_at.desc()
    ).all()

    result = []

    for product in products:

        result.append({
            "id": product.id,
            "title": product.title,
            "description": product.description,
            "price": product.price,
            "category": product.category,
            "condition": product.condition,
            "image": product.image,
            "seller_id": product.seller_id,
            "created_at": product.created_at
        })

    return {
        "products": result
    }, 200


# ==========================================
# GET SINGLE PRODUCT
# ==========================================

@products_bp.route("/<int:id>", methods=["GET"])
def get_product(id):

    product = Product.query.get(id)

    if not product:
        return {
            "message": "Product not found"
        }, 404

    return {
        "id": product.id,
        "title": product.title,
        "description": product.description,
        "price": product.price,
        "category": product.category,
        "condition": product.condition,
        "image": product.image,
        "seller_id": product.seller_id,
        "created_at": product.created_at
    }, 200


# ==========================================
# CREATE PRODUCT
# ==========================================

@products_bp.route("", methods=["POST"])
@jwt_required()
def create_product():

    data = request.get_json()

    required_fields = [
        "title",
        "description",
        "price",
        "category",
        "condition"
    ]

    for field in required_fields:

        if field not in data:
            return {
                "message": f"{field} is required"
            }, 400

    # Get logged-in user's ID from JWT
    user_id = get_jwt_identity()

    product = Product(
        title=data["title"],
        description=data["description"],
        price=data["price"],
        category=data["category"],
        condition=data["condition"],
        image=data.get("image"),
        seller_id=int(user_id)
    )

    db.session.add(product)
    db.session.commit()

    return {
        "message": "Product created successfully",
        "product": {
            "id": product.id,
            "title": product.title,
            "price": product.price,
            "category": product.category,
            "seller_id": product.seller_id
        }
    }, 201


# ==========================================
# UPDATE PRODUCT
# ==========================================

@products_bp.route("/<int:id>", methods=["PUT"])
@jwt_required()
def update_product(id):

    product = Product.query.get(id)

    if not product:
        return {
            "message": "Product not found"
        }, 404

    user_id = int(get_jwt_identity())

    # Only seller can update their product
    if product.seller_id != user_id:
        return {
            "message": "You are not authorized to update this product"
        }, 403

    data = request.get_json()

    product.title = data.get(
        "title",
        product.title
    )

    product.description = data.get(
        "description",
        product.description
    )

    product.price = data.get(
        "price",
        product.price
    )

    product.category = data.get(
        "category",
        product.category
    )

    product.condition = data.get(
        "condition",
        product.condition
    )

    product.image = data.get(
        "image",
        product.image
    )

    db.session.commit()

    return {
        "message": "Product updated successfully"
    }, 200


# ==========================================
# DELETE PRODUCT
# ==========================================

@products_bp.route("/<int:id>", methods=["DELETE"])
@jwt_required()
def delete_product(id):

    product = Product.query.get(id)

    if not product:
        return {
            "message": "Product not found"
        }, 404

    user_id = int(get_jwt_identity())

    # Only seller can delete their product
    if product.seller_id != user_id:
        return {
            "message": "You are not authorized to delete this product"
        }, 403

    db.session.delete(product)
    db.session.commit()

    return {
        "message": "Product deleted successfully"
    }, 200