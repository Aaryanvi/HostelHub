from flask import Flask
from flask_cors import CORS

from config import Config
from .extensions import db


def create_app():

    app = Flask(__name__)

    app.config.from_object(Config)

    CORS(app)

    db.init_app(app)

    from . import models

    with app.app_context():
        db.create_all()

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