import os
from flask import Flask, jsonify, send_from_directory
from flask_cors import CORS
from werkzeug.middleware.proxy_fix import ProxyFix
from app.routes.impact import impact_bp


from config import Config, DEFAULT_SECRET, DEFAULT_JWT_SECRET
from app.extensions import db, jwt, limiter


def create_app(config_object=Config):
    app = Flask(__name__)
    app.config.from_object(config_object)

    if app.config.get("APP_ENV") == "production":
        if app.config["SECRET_KEY"] == DEFAULT_SECRET or app.config["JWT_SECRET_KEY"] == DEFAULT_JWT_SECRET:
            raise RuntimeError("Set SECRET_KEY and JWT_SECRET_KEY environment variables in production.")

    # Trust the reverse proxy (Render, nginx...) so request.url_root uses the real https host.
    app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1)

    os.makedirs(app.config["UPLOAD_FOLDER"], exist_ok=True)

    db.init_app(app)
    jwt.init_app(app)
    limiter.init_app(app)
    CORS(app, resources={r"/api/*": {"origins": app.config["CORS_ORIGINS"]}}, supports_credentials=True)

    from app.routes.auth import auth_bp
    from app.routes.products import products_bp
    from app.routes.wishlist import wishlist_bp
    from app.routes.uploads import uploads_bp
    from app.routes.messages import messages_bp
    from app.routes.moderation import moderation_bp
    from app.routes.notifications import notifications_bp
    

    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(products_bp, url_prefix="/api/products")
    app.register_blueprint(wishlist_bp, url_prefix="/api/wishlist")
    app.register_blueprint(uploads_bp, url_prefix="/api/uploads")
    app.register_blueprint(messages_bp, url_prefix="/api/messages")
    app.register_blueprint(moderation_bp, url_prefix="/api/moderation")
    app.register_blueprint(impact_bp, url_prefix="/api/impact")
    app.register_blueprint(notifications_bp, url_prefix="/api/notifications")

    with app.app_context():
        # Creates any missing tables (e.g. messages, reports). Existing tables are untouched.
        db.create_all()

    @app.route("/uploads/<path:filename>")
    def serve_upload(filename):
        return send_from_directory(app.config["UPLOAD_FOLDER"], filename)

    @app.route("/api/health")
    def health():
        return jsonify({"status": "ok"})

    register_error_handlers(app)
    return app


def register_error_handlers(app):
    @app.errorhandler(404)
    def not_found(e):
        return jsonify({"error": "Resource not found."}), 404

    @app.errorhandler(405)
    def method_not_allowed(e):
        return jsonify({"error": "Method not allowed."}), 405

    @app.errorhandler(413)
    def too_large(e):
        return jsonify({"error": "File is too large. The maximum size is 5MB."}), 413

    @app.errorhandler(429)
    def rate_limited(e):
        return jsonify({"error": "Too many requests. Please wait a moment and try again."}), 429

    @app.errorhandler(500)
    def server_error(e):
        return jsonify({"error": "Something went wrong on our end. Please try again."}), 500

    @jwt.expired_token_loader
    def expired_token_callback(jwt_header, jwt_payload):
        return jsonify({"error": "Your session has expired. Please log in again."}), 401

    @jwt.invalid_token_loader
    def invalid_token_callback(error):
        return jsonify({"error": "Invalid authentication token. Please log in again."}), 401

    @jwt.unauthorized_loader
    def missing_token_callback(error):
        return jsonify({"error": "Authentication required. Please log in."}), 401
