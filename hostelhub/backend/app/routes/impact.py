from datetime import datetime, timezone
from math import isfinite

from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity

from app.extensions import db
from app.models import Product, User, ImpactTransaction


impact_bp = Blueprint("impact", __name__)

TRANSACTION_TYPES = {"sale", "exchange", "giveaway"}
MAX_SAVED_AMOUNT = 10_000_000
MAX_WEIGHT_KG = 10_000


def current_user_id():
    return int(get_jwt_identity())


def transaction_error(message, status_code):
    return jsonify({"error": message}), status_code


@impact_bp.route("/transactions", methods=["POST"])
@jwt_required()
def create_transaction():
    """
    The seller reports a transaction.
    The buyer must confirm it before it counts toward impact statistics.
    """
    user_id = current_user_id()
    data = request.get_json(silent=True) or {}

    product_id = data.get("product_id")
    buyer_id = data.get("buyer_id")
    transaction_type = str(
        data.get("transaction_type", "")
    ).strip().lower()

    if not isinstance(product_id, int) or isinstance(product_id, bool):
        return transaction_error("A valid product_id is required.", 422)

    if not isinstance(buyer_id, int) or isinstance(buyer_id, bool):
        return transaction_error("A valid buyer_id is required.", 422)

    if buyer_id == user_id:
        return transaction_error(
            "You cannot complete a transaction with yourself.", 422
        )

    if transaction_type not in TRANSACTION_TYPES:
        return transaction_error(
            "Transaction type must be sale, exchange, or giveaway.", 422
        )

    product = db.session.get(Product, product_id)
    if not product:
        return transaction_error("Product not found.", 404)

    # Only the product owner can report its transaction.
    if product.seller_id != user_id:
        return transaction_error(
            "Only the product's seller can report this transaction.", 403
        )

    if product.status != "available":
        return transaction_error(
            "This product is not currently available.", 409
        )

    buyer = db.session.get(User, buyer_id)
    if not buyer:
        return transaction_error("Buyer account not found.", 404)

    if product.seller_id == buyer.id:
        return transaction_error(
            "The seller cannot be the buyer.", 422
        )

    # Prevent multiple pending or completed transactions for one listing.
    existing = ImpactTransaction.query.filter(
        ImpactTransaction.product_id == product.id,
        ImpactTransaction.status.in_(["pending", "confirmed"]),
    ).first()

    if existing:
        return transaction_error(
            "This listing already has a pending or confirmed transaction.",
            409,
        )

    try:
        saved_amount = float(data.get("saved_amount", 0))
        weight_kg = float(data.get("weight_kg", 0))
    except (TypeError, ValueError):
        return transaction_error(
            "Savings and weight must be valid numbers.", 422
        )

    if (
        not isfinite(saved_amount)
        or saved_amount < 0
        or saved_amount > MAX_SAVED_AMOUNT
    ):
        return transaction_error("Invalid estimated savings amount.", 422)

    if (
        not isfinite(weight_kg)
        or weight_kg < 0
        or weight_kg > MAX_WEIGHT_KG
    ):
        return transaction_error("Invalid item weight.", 422)

    notes = data.get("notes", "")
    if not isinstance(notes, str) or len(notes) > 500:
        return transaction_error(
            "Notes must be text containing at most 500 characters.", 422
        )

    transaction = ImpactTransaction(
        product_id=product.id,
        seller_id=user_id,
        buyer_id=buyer.id,
        transaction_type=transaction_type,
        status="pending",
        saved_amount=saved_amount,
        weight_kg=weight_kg,
        notes=notes.strip() or None,
    )

    db.session.add(transaction)
    db.session.commit()

    return jsonify({
        "message": "Transaction created. Waiting for buyer confirmation.",
        "transaction": transaction.to_dict(),
    }), 201


@impact_bp.route("/transactions/<int:transaction_id>/confirm", methods=["POST"])
@jwt_required()
def confirm_transaction(transaction_id):
    """Only the buyer can confirm a reported transaction."""
    user_id = current_user_id()

    transaction = db.session.get(ImpactTransaction, transaction_id)
    if not transaction:
        return transaction_error("Transaction not found.", 404)

    if transaction.buyer_id != user_id:
        return transaction_error(
            "Only the buyer can confirm this transaction.", 403
        )

    if transaction.status != "pending":
        return transaction_error(
            "This transaction is no longer pending.", 409
        )

    product = db.session.get(Product, transaction.product_id)
    if not product:
        return transaction_error("Product not found.", 404)

    if product.status != "available":
        return transaction_error(
            "This listing is no longer available.", 409
        )

    # Check again to prevent a second completed transaction.
    another_confirmed = ImpactTransaction.query.filter(
        ImpactTransaction.product_id == transaction.product_id,
        ImpactTransaction.status == "confirmed",
        ImpactTransaction.id != transaction.id,
    ).first()

    if another_confirmed:
        return transaction_error(
            "Another transaction has already been confirmed for this listing.",
            409,
        )

    transaction.status = "confirmed"
    transaction.confirmed_at = datetime.now(timezone.utc)

    # Reuse existing product status for marketplace compatibility.
    product.status = "sold"

    db.session.commit()

    return jsonify({
        "message": "Transaction confirmed successfully.",
        "transaction": transaction.to_dict(),
    }), 200


@impact_bp.route("/transactions/<int:transaction_id>/reject", methods=["POST"])
@jwt_required()
def reject_transaction(transaction_id):
    """The buyer can reject a pending transaction report."""
    user_id = current_user_id()

    transaction = db.session.get(ImpactTransaction, transaction_id)
    if not transaction:
        return transaction_error("Transaction not found.", 404)

    if transaction.buyer_id != user_id:
        return transaction_error(
            "Only the buyer can reject this transaction.", 403
        )

    if transaction.status != "pending":
        return transaction_error(
            "Only pending transactions can be rejected.", 409
        )

    transaction.status = "rejected"
    db.session.commit()

    return jsonify({
        "message": "Transaction report rejected.",
        "transaction": transaction.to_dict(),
    }), 200


@impact_bp.route("/transactions", methods=["GET"])
@jwt_required()
def list_transactions():
    """Return the signed-in user's reported transactions."""
    user_id = current_user_id()

    transactions = (
        ImpactTransaction.query
        .filter(
            db.or_(
                ImpactTransaction.seller_id == user_id,
                ImpactTransaction.buyer_id == user_id,
            )
        )
        .order_by(
            ImpactTransaction.created_at.desc(),
            ImpactTransaction.id.desc(),
        )
        .all()
    )

    return jsonify({
        "transactions": [item.to_dict() for item in transactions],
        "count": len(transactions),
    }), 200


@impact_bp.route("/stats", methods=["GET"])
@jwt_required()
def impact_stats():
    """
    Return marketplace listing statistics and confirmed
    transaction-based sustainability statistics.
    """

    # -----------------------------------------
    # 1. MARKETPLACE LISTING STATISTICS
    # -----------------------------------------

    total_listings = Product.query.count()

    available_listings = Product.query.filter_by(
        status="available"
    ).count()

    sold_listings = Product.query.filter_by(
        status="sold"
    ).count()

    # Total value of currently available listings
    available_listed_value = (
        db.session.query(
            db.func.coalesce(db.func.sum(Product.price), 0)
        )
        .filter(Product.status == "available")
        .scalar()
    )

    # Total original listing value of sold products
    sold_listing_value = (
        db.session.query(
            db.func.coalesce(db.func.sum(Product.price), 0)
        )
        .filter(Product.status == "sold")
        .scalar()
    )

    # -----------------------------------------
    # 2. CONFIRMED TRANSACTION STATISTICS
    # -----------------------------------------

    confirmed = ImpactTransaction.query.filter_by(
        status="confirmed"
    )

    total_reused = confirmed.count()

    sale_count = confirmed.filter_by(
        transaction_type="sale"
    ).count()

    exchange_count = confirmed.filter_by(
        transaction_type="exchange"
    ).count()

    giveaway_count = confirmed.filter_by(
        transaction_type="giveaway"
    ).count()

    estimated_savings = (
        db.session.query(
            db.func.coalesce(
                db.func.sum(ImpactTransaction.saved_amount), 0
            )
        )
        .filter(ImpactTransaction.status == "confirmed")
        .scalar()
    )

    estimated_weight = (
        db.session.query(
            db.func.coalesce(
                db.func.sum(ImpactTransaction.weight_kg), 0
            )
        )
        .filter(ImpactTransaction.status == "confirmed")
        .scalar()
    )

    # -----------------------------------------
    # 3. CATEGORY STATISTICS
    # -----------------------------------------

    category_rows = (
        db.session.query(
            Product.category,
            db.func.count(Product.id)
        )
        .filter(Product.category.isnot(None))
        .group_by(Product.category)
        .order_by(db.func.count(Product.id).desc())
        .all()
    )

    categories = [
        {
            "name": name,
            "count": count
        }
        for name, count in category_rows
    ]

    # -----------------------------------------
    # 4. FINAL RESPONSE
    # -----------------------------------------

    return jsonify({

        "stats": {

            # Marketplace statistics
            "total_listings": total_listings,
            "available_listings": available_listings,
            "sold_listings": sold_listings,

            "available_listed_value": round(
                float(available_listed_value or 0), 2
            ),

            "sold_listing_value": round(
                float(sold_listing_value or 0), 2
            ),

            # Confirmed transaction statistics
            "total_reused": total_reused,
            "sales_completed": sale_count,
            "exchanges_completed": exchange_count,
            "giveaways_completed": giveaway_count,

            "estimated_money_saved": round(
                float(estimated_savings or 0), 2
            ),

            "estimated_weight_kg": round(
                float(estimated_weight or 0), 2
            ),
        },

        "categories": categories,

        "impact_note": (
            "Marketplace statistics count actual product listings. "
            "Sold listing value represents the original prices of "
            "products marked as sold. Reuse totals include confirmed "
            "transactions. Savings and weight are participant-provided "
            "estimates, not independently verified measurements. "
            "Listing value is not proof of payment."
        )

    }), 200
