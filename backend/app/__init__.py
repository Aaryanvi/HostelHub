from flask import Flask
from flask_cors import CORS

from config import Config
from .extensions import db,jwt


def create_app():

    app = Flask(__name__)

    app.config.from_object(Config)

    CORS(app)

    db.init_app(app)
    jwt.init_app(app)

    from . import models

    with app.app_context():
        db.create_all()

        from .routes.auth import auth_bp

        app.register_blueprint(auth_bp)

        from .routes.products import products_bp

        app.register_blueprint(products_bp)

    @app.route("/")
    def home():
        return {
            "message": "HostelHub backend is running!"
        }

    @app.route("/api/health")
    def health():
        return {
            "status": "success",
            "message": "HostelHub API is healthy"
        }

    return app