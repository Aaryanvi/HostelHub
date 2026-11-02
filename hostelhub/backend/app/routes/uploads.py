import os
import uuid

import cloudinary
import cloudinary.uploader

from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required
from app.extensions import limiter

uploads_bp = Blueprint("uploads", __name__)


def detect_image_type(head):
    """Identify an image from its actual file bytes."""
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
        return jsonify({
            "error": "Only JPG, PNG, GIF or WebP images are allowed."
        }), 422

    # Read Cloudinary credentials from environment variables.
    cloud_name = os.environ.get("CLOUDINARY_CLOUD_NAME")
    api_key = os.environ.get("CLOUDINARY_API_KEY")
    api_secret = os.environ.get("CLOUDINARY_API_SECRET")

    # If all credentials are configured, upload to Cloudinary.
    if cloud_name and api_key and api_secret:
        try:
            cloudinary.config(
                cloud_name=cloud_name,
                api_key=api_key,
                api_secret=api_secret,
                secure=True
            )

            result = cloudinary.uploader.upload(
                file.stream,
                folder="hostelhub",
                public_id=uuid.uuid4().hex,
                resource_type="image",
                allowed_formats=["jpg", "png", "gif", "webp"]
            )

            image_url = result["secure_url"]

            return jsonify({
                "path": image_url,
                "url": image_url
            }), 201

        except Exception:
            current_app.logger.exception("Cloudinary image upload failed.")
            return jsonify({
                "error": "Image upload failed. Please try again."
            }), 502

    # If no Cloudinary credentials are configured, use local storage.
    if cloud_name or api_key or api_secret:
        return jsonify({
            "error": "Cloudinary credentials are incomplete."
        }), 500

    filename = f"{uuid.uuid4().hex}.{ext}"
    upload_folder = current_app.config["UPLOAD_FOLDER"]

    os.makedirs(upload_folder, exist_ok=True)

    file.save(os.path.join(upload_folder, filename))

    path = f"/uploads/{filename}"

    return jsonify({
        "path": path,
        "url": request.url_root.rstrip("/") + path
    }), 201