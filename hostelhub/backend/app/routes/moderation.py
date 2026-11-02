from functools import wraps

from flask import Blueprint, request, jsonify

from flask_jwt_extended import (
    jwt_required,
    get_jwt_identity,
    verify_jwt_in_request
)

from app.extensions import db, limiter

from app.models import (
    Product,
    Report,
    User,
    Notification,
    delete_product_cascade,
    iso
)


moderation_bp = Blueprint("moderation", __name__)


REASONS = {
    "Spam or scam",
    "Prohibited item",
    "Misleading information",
    "Inappropriate content",
    "Other",
}


# --------------------------------------------------
# ADMIN AUTHENTICATION
# --------------------------------------------------

def admin_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):

        verify_jwt_in_request()

        user = db.session.get(
            User,
            int(get_jwt_identity())
        )

        if not user or not user.is_admin:
            return jsonify({
                "error": "Admin access required."
            }), 403

        return fn(*args, **kwargs)

    return wrapper


# --------------------------------------------------
# GET REPORT REASONS
# --------------------------------------------------

@moderation_bp.route("/reasons", methods=["GET"])
def reasons():

    return jsonify({
        "reasons": sorted(REASONS)
    }), 200


# --------------------------------------------------
# REPORT A LISTING
# --------------------------------------------------

@moderation_bp.route("/report/<int:product_id>", methods=["POST"])
@jwt_required()
@limiter.limit("10 per hour")
def report_listing(product_id):

    user_id = int(get_jwt_identity())

    # Find the product
    product = db.session.get(Product, product_id)

    if not product:
        return jsonify({
            "error": "Product not found."
        }), 404

    # Prevent sellers from reporting their own products
    if product.seller_id == user_id:
        return jsonify({
            "error": "You can't report your own listing."
        }), 403

    data = request.get_json(silent=True) or {}

    reason = data.get("reason")

    if reason not in REASONS:
        return jsonify({
            "error": "Select a reason.",
            "fields": {
                "reason": "Select a reason."
            }
        }), 422

    details = data.get("details")

    details = (
        details.strip()[:1000]
        if isinstance(details, str)
        else ""
    )

    # Prevent duplicate reports from the same user
    existing_report = Report.query.filter_by(
        product_id=product_id,
        reporter_id=user_id
    ).first()

    if existing_report:
        return jsonify({
            "error": "You've already reported this listing."
        }), 409

    # Create report
    report = Report(
        product_id=product_id,
        reporter_id=user_id,
        reason=reason,
        details=details or None
    )

    db.session.add(report)

    # --------------------------------------------------
    # NEW: NOTIFY THE SELLER
    # --------------------------------------------------

    notification = Notification(
        user_id=product.seller_id,
        title="Your listing has been reported",
        message=(
            f'Your listing "{product.title}" has been reported. '
            "Our moderation team will review it. "
            "Please ensure that your listing follows "
            "HostelHub guidelines."
        ),
        notification_type="report"
    )

    db.session.add(notification)

    # Save report and notification together
    db.session.commit()

    return jsonify({
        "message": (
            "Thanks — our moderators will review this listing."
        )
    }), 201


# --------------------------------------------------
# ADMIN: VIEW REPORTS
# --------------------------------------------------

@moderation_bp.route("/reports", methods=["GET"])
@admin_required
def list_reports():

    status = request.args.get("status", "open")

    query = Report.query

    if status in ("open", "resolved"):
        query = query.filter_by(status=status)

    reports = (
        query
        .order_by(
            Report.created_at.desc(),
            Report.id.desc()
        )
        .all()
    )

    return jsonify({
        "reports": [
            {
                "id": r.id,
                "reason": r.reason,
                "details": r.details,
                "status": r.status,
                "created_at": iso(r.created_at),

                "reporter": {
                    "id": r.reporter.id,
                    "name": r.reporter.name
                },

                "product": {
                    "id": r.product.id,
                    "title": r.product.title,
                    "status": r.product.status,
                    "seller": (
                        r.product.seller.name
                        if r.product.seller
                        else None
                    )
                }
            }

            for r in reports
        ]
    }), 200


# --------------------------------------------------
# ADMIN: RESOLVE / DISMISS REPORT
# --------------------------------------------------

@moderation_bp.route(
    "/reports/<int:report_id>/resolve",
    methods=["POST"]
)
@admin_required
def resolve_report(report_id):

    report = db.session.get(Report, report_id)

    if not report:
        return jsonify({
            "error": "Report not found."
        }), 404

    # Capture seller and product details
    # before updating the report
    product = report.product

    if product and product.seller_id:

        notification = Notification(
            user_id=product.seller_id,
            title="Report review completed",
            message=(
                f'The report regarding your listing '
                f'"{product.title}" has been reviewed. '
                "No removal action was taken."
            ),
            notification_type="report_resolved"
        )

        db.session.add(notification)

    report.status = "resolved"

    db.session.commit()

    return jsonify({
        "message": "Report dismissed."
    }), 200


# --------------------------------------------------
# ADMIN: REMOVE A LISTING
# --------------------------------------------------

@moderation_bp.route(
    "/products/<int:product_id>",
    methods=["DELETE"]
)
@admin_required
def remove_listing(product_id):

    product = db.session.get(Product, product_id)

    if not product:
        return jsonify({
            "error": "Product not found."
        }), 404

    # Capture seller information BEFORE deleting product
    seller_id = product.seller_id
    product_title = product.title

    # --------------------------------------------------
    # NEW: NOTIFY SELLER BEFORE DELETING LISTING
    # --------------------------------------------------

    if seller_id:

        notification = Notification(
            user_id=seller_id,
            title="Your listing has been removed",
            message=(
                f'Your listing "{product_title}" '
                "has been removed by the HostelHub "
                "moderation team because it violated "
                "or may have violated our guidelines."
            ),
            notification_type="listing_removed"
        )

        db.session.add(notification)

    # Delete product and related records
    delete_product_cascade(product)

    db.session.commit()

    return jsonify({
        "message": "Listing removed."
    }), 200

# --------------------------------------------------
# WITHDRAW / UNREPORT A LISTING
# --------------------------------------------------

@moderation_bp.route(
    "/report/<int:product_id>",
    methods=["DELETE"]
)
@jwt_required()
@limiter.limit("10 per hour")
def withdraw_report(product_id):

    user_id = int(get_jwt_identity())

    product = db.session.get(Product, product_id)

    if not product:
        return jsonify({
            "error": "Product not found."
        }), 404

    # Find only the report submitted by the logged-in user
    report = Report.query.filter_by(
        product_id=product_id,
        reporter_id=user_id
    ).first()

    if not report:
        return jsonify({
            "error": "You have not reported this listing."
        }), 404

    # Notify the seller that the report was withdrawn
    notification = Notification(
        user_id=product.seller_id,
        title="A report against your listing was withdrawn",
        message=(
            f'The report against your listing "{product.title}" '
            "has been withdrawn by the person who submitted it."
        ),
        notification_type="report_withdrawn"
    )

    db.session.add(notification)

    # Remove the report
    db.session.delete(report)

    db.session.commit()

    return jsonify({
        "message": "Your report has been successfully withdrawn."
    }), 200

@moderation_bp.route(
    "/report/<int:product_id>/mine",
    methods=["GET"]
)
@jwt_required()
def my_report_status(product_id):
    user_id = int(get_jwt_identity())

    report = Report.query.filter_by(
        product_id=product_id,
        reporter_id=user_id
    ).first()

    return jsonify({
        "reported": report is not None
    }), 200