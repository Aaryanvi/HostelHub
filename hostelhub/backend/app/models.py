from datetime import datetime, timezone
from flask import current_app, has_request_context, request
from werkzeug.security import generate_password_hash, check_password_hash
from app.extensions import db


def utcnow():
    return datetime.now(timezone.utc)


def iso(dt):
    """ISO string that always carries a timezone (SQLite returns naive datetimes)."""
    if not dt:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.isoformat()


def public_image_url(path):
    """Uploaded images are stored as '/uploads/x.jpg'; expose a full URL to the frontend."""
    if not path:
        return None
    if path.startswith("/uploads/") and has_request_context():
        return request.url_root.rstrip("/") + path
    return path


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(180), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    phone = db.Column(db.String(20), nullable=True)
    hostel = db.Column(db.String(100), nullable=True)
    branch = db.Column(db.String(100), nullable=True)
    year = db.Column(db.String(20), nullable=True)
    created_at = db.Column(db.DateTime, default=utcnow)

    products = db.relationship(
        "Product", backref="seller", lazy=True, cascade="all, delete-orphan"
    )
    wishlist_items = db.relationship(
        "Wishlist", backref="user", lazy=True, cascade="all, delete-orphan"
    )

    @property
    def is_admin(self):
        return (self.email or "").lower() in current_app.config.get("ADMIN_EMAILS", [])

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def to_dict(self, include_email=True):
        data = {
            "id": self.id,
            "name": self.name,
            "hostel": self.hostel,
            "branch": self.branch,
            "year": self.year,
            "created_at": iso(self.created_at),
        }
        if include_email:
            data["email"] = self.email
            data["phone"] = self.phone
            data["is_admin"] = self.is_admin
        return data


class Product(db.Model):
    __tablename__ = "products"

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(150), nullable=False)
    description = db.Column(db.Text, nullable=False, default="")
    price = db.Column(db.Float, nullable=False)
    category = db.Column(db.String(50), nullable=False, index=True)
    condition = db.Column(db.String(30), nullable=False, default="Good")
    image = db.Column(db.String(500), nullable=True)
    status = db.Column(db.String(20), nullable=False, default="available")  # available | sold
    seller_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    created_at = db.Column(db.DateTime, default=utcnow)
    updated_at = db.Column(db.DateTime, default=utcnow, onupdate=utcnow)

    def to_dict(self, current_user_id=None):
        saved = False
        if current_user_id:
            saved = Wishlist.query.filter_by(
                user_id=current_user_id, product_id=self.id
            ).first() is not None

        return {
            "id": self.id,
            "title": self.title,
            "description": self.description,
            "price": self.price,
            "category": self.category,
            "condition": self.condition,
            "image": public_image_url(self.image),  # full URL, for <img src>
            "image_path": self.image,               # raw stored value, for the edit form
            "status": self.status,
            "created_at": iso(self.created_at),
            "seller": self.seller.to_dict(include_email=False) if self.seller else None,
            "seller_id": self.seller_id,
            "is_saved": saved,
        }


class Wishlist(db.Model):
    __tablename__ = "wishlist"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    product_id = db.Column(db.Integer, db.ForeignKey("products.id"), nullable=False)
    created_at = db.Column(db.DateTime, default=utcnow)

    product = db.relationship("Product")

    __table_args__ = (
        db.UniqueConstraint("user_id", "product_id", name="uq_user_product_wishlist"),
    )


class Message(db.Model):
    """One chat message. A conversation = (product, buyer, seller)."""
    __tablename__ = "messages"

    id = db.Column(db.Integer, primary_key=True)
    product_id = db.Column(db.Integer, db.ForeignKey("products.id"), nullable=False, index=True)
    sender_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    receiver_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    body = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=utcnow)
    read_at = db.Column(db.DateTime, nullable=True)

    product = db.relationship("Product")
    sender = db.relationship("User", foreign_keys=[sender_id])
    receiver = db.relationship("User", foreign_keys=[receiver_id])

    def to_dict(self):
        return {
            "id": self.id,
            "product_id": self.product_id,
            "sender_id": self.sender_id,
            "receiver_id": self.receiver_id,
            "body": self.body,
            "created_at": iso(self.created_at),
            "read": self.read_at is not None,
        }


class Report(db.Model):
    """A user's report against a listing, reviewed by admins."""
    __tablename__ = "reports"

    id = db.Column(db.Integer, primary_key=True)
    product_id = db.Column(db.Integer, db.ForeignKey("products.id"), nullable=False, index=True)
    reporter_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    reason = db.Column(db.String(60), nullable=False)
    details = db.Column(db.Text, nullable=True)
    status = db.Column(db.String(20), nullable=False, default="open")  # open | resolved
    created_at = db.Column(db.DateTime, default=utcnow)

    product = db.relationship("Product")
    reporter = db.relationship("User", foreign_keys=[reporter_id])

    __table_args__ = (
        db.UniqueConstraint("product_id", "reporter_id", name="uq_report_once_per_user"),
    )


def delete_product_cascade(product):
    """Delete a product plus everything that points to it (needed for PostgreSQL FKs)."""
    Wishlist.query.filter_by(product_id=product.id).delete()
    Message.query.filter_by(product_id=product.id).delete()
    Report.query.filter_by(product_id=product.id).delete()
    db.session.delete(product)

class ImpactTransaction(db.Model):
    __tablename__ = "impact_transactions"

    id = db.Column(db.Integer, primary_key=True)

    product_id = db.Column(
        db.Integer,
        db.ForeignKey("products.id"),
        nullable=False,
        index=True,
    )

    seller_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id"),
        nullable=False,
        index=True,
    )

    buyer_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id"),
        nullable=False,
        index=True,
    )

    # sale | exchange | giveaway
    transaction_type = db.Column(db.String(20), nullable=False)

    # pending | confirmed | rejected
    status = db.Column(
        db.String(20),
        nullable=False,
        default="pending",
        index=True,
    )

    # Amount the buyer estimates they saved compared with buying new.
    saved_amount = db.Column(db.Float, nullable=False, default=0)

    # Optional estimated weight of the item in kilograms.
    weight_kg = db.Column(db.Float, nullable=False, default=0)

    notes = db.Column(db.String(500), nullable=True)

    created_at = db.Column(db.DateTime, default=utcnow, nullable=False)
    confirmed_at = db.Column(db.DateTime, nullable=True)

    product = db.relationship("Product")
    seller = db.relationship("User", foreign_keys=[seller_id])
    buyer = db.relationship("User", foreign_keys=[buyer_id])

    def to_dict(self):
        return {
            "id": self.id,
            "product_id": self.product_id,
            "product_title": self.product.title if self.product else None,
            "seller_id": self.seller_id,
            "seller_name": self.seller.name if self.seller else None,
            "buyer_id": self.buyer_id,
            "buyer_name": self.buyer.name if self.buyer else None,
            "transaction_type": self.transaction_type,
            "status": self.status,
            "saved_amount": self.saved_amount,
            "weight_kg": self.weight_kg,
            "notes": self.notes,
            "created_at": iso(self.created_at),
            "confirmed_at": iso(self.confirmed_at),
        }