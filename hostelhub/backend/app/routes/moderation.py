from functools import wraps
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, verify_jwt_in_request
from app.extensions import db, limiter
from app.models import Product, Report, User, delete_product_cascade, iso

moderation_bp = Blueprint("moderation", __name__)

REASONS = {
    "Spam or scam",
    "Prohibited item",
    "Misleading information",
    "Inappropriate content",
    "Other",
}


def admin_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        verify_jwt_in_request()
        user = db.session.get(User, int(get_jwt_identity()))
        if not user or not user.is_admin:
            return jsonify({"error": "Admin access required."}), 403
        return fn(*args, **kwargs)
    return wrapper


@moderation_bp.route("/reasons", methods=["GET"])
def reasons():
    return jsonify({"reasons": sorted(REASONS)}), 200


@moderation_bp.route("/report/<int:product_id>", methods=["POST"])
@jwt_required()
@limiter.limit("10 per hour")
def report_listing(product_id):
    user_id = int(get_jwt_identity())
    product = db.session.get(Product, product_id)
    if not product:
        return jsonify({"error": "Product not found."}), 404

    if product.seller_id == user_id:
        return jsonify({"error": "You can't report your own listing."}), 403

    data = request.get_json(silent=True) or {}
    reason = data.get("reason")
    if reason not in REASONS:
        return jsonify({"error": "Select a reason.", "fields": {"reason": "Select a reason."}}), 422

    details = data.get("details")
    details = details.strip()[:1000] if isinstance(details, str) else ""

    if Report.query.filter_by(product_id=product_id, reporter_id=user_id).first():
        return jsonify({"error": "You've already reported this listing."}), 409

    db.session.add(Report(product_id=product_id, reporter_id=user_id, reason=reason, details=details or None))
    db.session.commit()
    return jsonify({"message": "Thanks — our moderators will review this listing."}), 201


@moderation_bp.route("/reports", methods=["GET"])
@admin_required
def list_reports():
    status = request.args.get("status", "open")
    query = Report.query
    if status in ("open", "resolved"):
        query = query.filter_by(status=status)
    reports = query.order_by(Report.created_at.desc(), Report.id.desc()).all()

    return jsonify({"reports": [
        {
            "id": r.id,
            "reason": r.reason,
            "details": r.details,
            "status": r.status,
            "created_at": iso(r.created_at),
            "reporter": {"id": r.reporter.id, "name": r.reporter.name},
            "product": {
                "id": r.product.id,
                "title": r.product.title,
                "status": r.product.status,
                "seller": r.product.seller.name if r.product.seller else None,
            },
        }
        for r in reports
    ]}), 200


@moderation_bp.route("/reports/<int:report_id>/resolve", methods=["POST"])
@admin_required
def resolve_report(report_id):
    report = db.session.get(Report, report_id)
    if not report:
        return jsonify({"error": "Report not found."}), 404
    report.status = "resolved"
    db.session.commit()
    return jsonify({"message": "Report dismissed."}), 200


@moderation_bp.route("/products/<int:product_id>", methods=["DELETE"])
@admin_required
def remove_listing(product_id):
    product = db.session.get(Product, product_id)
    if not product:
        return jsonify({"error": "Product not found."}), 404
    delete_product_cascade(product)
    db.session.commit()
    return jsonify({"message": "Listing removed."}), 200
