import os
import uuid
from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required
from app.extensions import limiter

uploads_bp = Blueprint("uploads", __name__)


def detect_image_type(head):
    """Identify an image from its first bytes. We never trust the filename the browser sends."""
    if head.startswith(b"\xff\xd8\xff"):
        return "jpg"
    if head.startswith(b"\x89PNG\r\n\x1a\n"):
        return "png"
    if head[:6] in (b"GIF87a", b"GIF89a"):
        return "gif"
    if head[:4] == b"RIFF" and head[8:12] == b"WEBP":
        return "webp"
    return None


@uploads_bp.route("", methods=["POST"])
@jwt_required()
@limiter.limit("30 per hour")
def upload_image():
    file = request.files.get("image")
    if not file or not file.filename:
        return jsonify({"error": "Choose an image to upload."}), 422

    head = file.stream.read(12)
    file.stream.seek(0)
    ext = detect_image_type(head)
    if not ext:
        return jsonify({"error": "Only JPG, PNG, GIF or WebP images are allowed."}), 422

    filename = f"{uuid.uuid4().hex}.{ext}"
    file.save(os.path.join(current_app.config["UPLOAD_FOLDER"], filename))

    path = f"/uploads/{filename}"
    return jsonify({"path": path, "url": request.url_root.rstrip("/") + path}), 201
