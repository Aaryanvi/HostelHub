from .extensions import db


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)

    name = db.Column(
        db.String(100),
        nullable=False
    )

    email = db.Column(
        db.String(120),
        unique=True,
        nullable=False
    )

    password = db.Column(
        db.String(255),
        nullable=False
    )

    phone = db.Column(db.String(20))

    hostel = db.Column(db.String(100))

    branch = db.Column(db.String(100))

    year = db.Column(db.Integer)

    created_at = db.Column(
        db.DateTime,
        server_default=db.func.now()
    )

    products = db.relationship(
        "Product",
        backref="seller",
        lazy=True
    )


class Product(db.Model):
    __tablename__ = "products"

    id = db.Column(
        db.Integer,
        primary_key=True
    )

    title = db.Column(
        db.String(150),
        nullable=False
    )

    description = db.Column(
        db.Text,
        nullable=False
    )

    price = db.Column(
        db.Float,
        nullable=False
    )

    category = db.Column(
        db.String(100),
        nullable=False
    )

    condition = db.Column(
        db.String(50),
        nullable=False
    )

    image = db.Column(
        db.String(500)
    )

    seller_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id"),
        nullable=False
    )

    created_at = db.Column(
        db.DateTime,
        server_default=db.func.now()
    )