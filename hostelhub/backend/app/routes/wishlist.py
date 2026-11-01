from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.extensions import db
from app.models import Wishlist, Product

wishlist_bp = Blueprint("wishlist", __name__)


@wishlist_bp.route("", methods=["GET"])
@jwt_required()
def get_wishlist():
    user_id = int(get_jwt_identity())

    items = (
        Wishlist.query.filter_by(user_id=user_id)
        .order_by(Wishlist.created_at.desc())
        .all()
    )

    products = []
    for item in items:
        if item.product:
            product_data = item.product.to_dict(user_id)
            products.append(product_data)

    return jsonify({"products": products, "count": len(products)}), 200


@wishlist_bp.route("/<int:product_id>", methods=["POST"])
@jwt_required()
def add_to_wishlist(product_id):
    user_id = int(get_jwt_identity())

    product = Product.query.get(product_id)
    if not product:
        return jsonify({"error": "Product not found."}), 404

    existing = Wishlist.query.filter_by(user_id=user_id, product_id=product_id).first()
    if existing:
        return jsonify({"error": "That item is already saved."}), 409

    item = Wishlist(user_id=user_id, product_id=product_id)
    db.session.add(item)
    db.session.commit()

    return jsonify({"message": "Added to saved items.", "is_saved": True}), 201


@wishlist_bp.route("/<int:product_id>", methods=["DELETE"])
@jwt_required()
def remove_from_wishlist(product_id):
    user_id = int(get_jwt_identity())

    item = Wishlist.query.filter_by(user_id=user_id, product_id=product_id).first()
    if not item:
        return jsonify({"error": "Item is not in your saved list."}), 404

    db.session.delete(item)
    db.session.commit()

    return jsonify({"message": "Removed from saved items.", "is_saved": False}), 200


@wishlist_bp.route("/<int:product_id>/check", methods=["GET"])
@jwt_required()
def check_wishlist(product_id):
    user_id = int(get_jwt_identity())

    exists = Wishlist.query.filter_by(user_id=user_id, product_id=product_id).first() is not None

    return jsonify({"is_saved": exists}), 200
