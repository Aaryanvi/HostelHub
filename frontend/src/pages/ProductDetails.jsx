import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import "./ProductDetails.css";

function ProductDetails() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        const fetchProduct = async () => {
            try {
                const response = await axios.get(
                    `http://localhost:5000/api/products/${id}`
                );

                setProduct(response.data);

            } catch (err) {
                console.error("Error fetching product:", err);
                setError("Product not found");

            } finally {
                setLoading(false);
            }
        };

        fetchProduct();
    }, [id]);

    if (loading) {
        return (
            <div className="product-loading">
                <h2>Loading...</h2>
            </div>
        );
    }

    if (error || !product) {
        return (
            <div className="product-error">
                <h2>Product not found</h2>

                <button onClick={() => navigate("/")}>
                    Back to Marketplace
                </button>
            </div>
        );
    }

    return (
        <div className="product-details-container">

            <button
                className="back-button"
                onClick={() => navigate("/products")}
            >
                ← Back to Marketplace
            </button>

            <div className="product-details-card">

                {/* PRODUCT INFORMATION */}

                <div className="product-info">

                    <h1>{product.title}</h1>

                    <h2 className="product-price">
                        ₹{product.price}
                    </h2>

                    <p className="product-description">
                        {product.description}
                    </p>

                    <div className="product-meta">

                        <p>
                            <strong>Category:</strong>{" "}
                            {product.category}
                        </p>

                        <p>
                            <strong>Condition:</strong>{" "}
                            {product.condition}
                        </p>

                    </div>

                </div>

                {/* SELLER INFORMATION */}

                {product.seller && (
                    <div className="seller-section">

                        <h2>Seller Information</h2>

                        <div className="seller-card">

                            <div className="seller-name">
                                👤 {product.seller.name}
                            </div>

                            <p>
                                🏠 <strong>Hostel:</strong>{" "}
                                {product.seller.hostel || "Not provided"}
                            </p>

                            <p>
                                🎓 <strong>Branch:</strong>{" "}
                                {product.seller.branch || "Not provided"}
                            </p>

                            <p>
                                📚 <strong>Year:</strong>{" "}
                                {product.seller.year || "Not provided"}
                            </p>

                            <p>
                                📧 <strong>Email:</strong>{" "}
                                {product.seller.email}
                            </p>

                            {product.seller.phone && (
                                <p>
                                    📞 <strong>Phone:</strong>{" "}
                                    {product.seller.phone}
                                </p>
                            )}

                            <div className="seller-actions">

                                {product.seller.phone && (
                                    <a
                                        href={`tel:${product.seller.phone}`}
                                        className="contact-button"
                                    >
                                        📞 Contact Seller
                                    </a>
                                )}

                                <a
                                    href={`mailto:${product.seller.email}`}
                                    className="email-button"
                                >
                                    ✉️ Email Seller
                                </a>

                            </div>

                        </div>

                    </div>
                )}

            </div>

        </div>
    );
}

export default ProductDetails;