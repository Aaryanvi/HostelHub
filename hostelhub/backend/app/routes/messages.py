from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.extensions import db, limiter
from app.models import Message, Product, User, public_image_url, utcnow, iso

messages_bp = Blueprint("messages", __name__)

MAX_BODY = 1000


def _user_summary(user):
    return {"id": user.id, "name": user.name, "hostel": user.hostel}


def _product_summary(product):
    return {
        "id": product.id,
        "title": product.title,
        "price": product.price,
        "image": public_image_url(product.image),
        "status": product.status,
    }


def _to_int(value):
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


@messages_bp.route("", methods=["POST"])
@jwt_required()
@limiter.limit("30 per minute")
def send_message():
    user_id = int(get_jwt_identity())
    data = request.get_json(silent=True) or {}

    body = data.get("body")
    body = body.strip() if isinstance(body, str) else ""
    if not body:
        return jsonify({"error": "Write a message first.", "fields": {"body": "Message is required."}}), 422
    if len(body) > MAX_BODY:
        return jsonify({"error": f"Messages can be up to {MAX_BODY} characters.", "fields": {"body": "Message is too long."}}), 422

    product_id = _to_int(data.get("product_id"))
    product = db.session.get(Product, product_id) if product_id else None
    if not product:
        return jsonify({"error": "Product not found."}), 404

    if user_id == product.seller_id:
        # Seller replying to a buyer: only allowed if that buyer already wrote first.
        receiver_id = _to_int(data.get("receiver_id"))
        if not receiver_id:
            return jsonify({"error": "Choose who you are replying to.", "fields": {"receiver_id": "Required."}}), 422
        has_thread = Message.query.filter_by(
            product_id=product.id, sender_id=receiver_id, receiver_id=user_id
        ).first()
        if not has_thread:
            return jsonify({"error": "You can only reply to buyers who contacted you."}), 403
    else:
        receiver_id = product.seller_id

    message = Message(product_id=product.id, sender_id=user_id, receiver_id=receiver_id, body=body)
    db.session.add(message)
    db.session.commit()

    return jsonify({"message": message.to_dict()}), 201


@messages_bp.route("/conversations", methods=["GET"])
@jwt_required()
def conversations():
    user_id = int(get_jwt_identity())

    rows = (
        Message.query.filter(db.or_(Message.sender_id == user_id, Message.receiver_id == user_id))
        .order_by(Message.created_at.desc(), Message.id.desc())
        .all()
    )

    convs = {}
    for m in rows:
        other = m.receiver if m.sender_id == user_id else m.sender
        key = (m.product_id, other.id)
        conv = convs.get(key)
        if conv is None:
            conv = {
                "product": _product_summary(m.product),
                "other_user": _user_summary(other),
                "last_message": {
                    "body": m.body,
                    "created_at": iso(m.created_at),
                    "from_me": m.sender_id == user_id,
                },
                "unread": 0,
            }
            convs[key] = conv  # first seen = newest, so dict order is newest-first
        if m.receiver_id == user_id and m.read_at is None:
            conv["unread"] += 1

    return jsonify({"conversations": list(convs.values())}), 200


@messages_bp.route("/thread", methods=["GET"])
@jwt_required()
def thread():
    user_id = int(get_jwt_identity())
    product_id = request.args.get("product_id", type=int)
    other_id = request.args.get("user_id", type=int)

    product = db.session.get(Product, product_id) if product_id else None
    other = db.session.get(User, other_id) if other_id else None
    if not product or not other:
        return jsonify({"error": "Conversation not found."}), 404

    msgs = (
        Message.query.filter(
            Message.product_id == product.id,
            db.or_(
                db.and_(Message.sender_id == user_id, Message.receiver_id == other.id),
                db.and_(Message.sender_id == other.id, Message.receiver_id == user_id),
            ),
        )
        .order_by(Message.created_at.asc(), Message.id.asc())
        .all()
    )

    # Opening the thread marks incoming messages as read.
    changed = False
    for m in msgs:
        if m.receiver_id == user_id and m.read_at is None:
            m.read_at = utcnow()
            changed = True
    if changed:
        db.session.commit()

    return jsonify({
        "product": _product_summary(product),
        "other_user": _user_summary(other),
        "messages": [m.to_dict() for m in msgs],
    }), 200


@messages_bp.route("/unread-count", methods=["GET"])
@jwt_required()
def unread_count():
    user_id = int(get_jwt_identity())
    count = Message.query.filter_by(receiver_id=user_id, read_at=None).count()
    return jsonify({"unread": count}), 200
