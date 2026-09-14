import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./Profile.css";

function Profile() {
    const navigate = useNavigate();

    const [user, setUser] = useState(null);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        const token = localStorage.getItem("token");

        // If user is not logged in
        if (!token) {
            navigate("/login");
            return;
        }

        try {
            // Get current user
            const userResponse = await axios.get(
                "http://localhost:5000/api/auth/me",
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );

            setUser(userResponse.data);

            // Get user's products
            const productsResponse = await axios.get(
                "http://localhost:5000/api/products/my-products",
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );

            setProducts(productsResponse.data.products || []);

        } catch (err) {
            console.error("Profile error:", err);

            if (err.response?.status === 401) {
                localStorage.removeItem("token");
                localStorage.removeItem("user");
                navigate("/login");
            } else {
                setError("Failed to load profile");
            }

        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");

        navigate("/login");
    };

    if (loading) {
        return (
            <div className="profile-loading">
                <h2>Loading profile...</h2>
            </div>
        );
    }

    if (error) {
        return (
            <div className="profile-error">
                <h2>{error}</h2>

                <button onClick={() => navigate("/")}>
                    Back to Marketplace
                </button>
            </div>
        );
    }

    return (
        <div className="profile-page">

            {/* Header */}
            <div className="profile-header">

                <button
                    className="back-btn"
                    onClick={() => navigate("/")}
                >
                    ← Marketplace
                </button>

                <button
                    className="logout-btn"
                    onClick={handleLogout}
                >
                    Logout
                </button>

            </div>


            {/* Profile Card */}
            <div className="profile-card">

                <div className="profile-avatar">
                    {user?.name?.charAt(0).toUpperCase()}
                </div>

                <div className="profile-info">

                    <h1>{user?.name}</h1>

                    <p className="profile-email">
                        {user?.email}
                    </p>

                </div>

            </div>


            {/* User Details */}
            <div className="details-card">

                <h2>Personal Information</h2>

                <div className="details-grid">

                    <div>
                        <strong>📱 Phone</strong>
                        <span>{user?.phone || "Not provided"}</span>
                    </div>

                    <div>
                        <strong>🏠 Hostel</strong>
                        <span>{user?.hostel || "Not provided"}</span>
                    </div>

                    <div>
                        <strong>💻 Branch</strong>
                        <span>{user?.branch || "Not provided"}</span>
                    </div>

                    <div>
                        <strong>🎓 Year</strong>
                        <span>{user?.year || "Not provided"}</span>
                    </div>

                </div>

            </div>


            {/* My Products */}
            <div className="my-products">

                <div className="products-heading">

                    <h2>My Listed Items</h2>

                    <button
                        onClick={() => navigate("/add-product")}
                    >
                        + Sell an Item
                    </button>

                </div>


                {products.length === 0 ? (

                    <div className="empty-products">

                        <h3>No items listed yet</h3>

                        <p>
                            Start selling items to other students.
                        </p>

                        <button
                            onClick={() => navigate("/add-product")}
                        >
                            List Your First Item
                        </button>

                    </div>

                ) : (

                    <div className="profile-products-grid">

                        {products.map((product) => (

                            <div
                                className="profile-product-card"
                                key={product.id}
                            >

                                <div className="product-image">
                                    {product.image ? (
                                        <img
                                            src={product.image}
                                            alt={product.title}
                                        />
                                    ) : (
                                        "📦"
                                    )}
                                </div>

                                <div className="product-card-content">

                                    <h3>{product.title}</h3>

                                    <p>
                                        {product.description}
                                    </p>

                                    <h3 className="product-price">
                                        ₹{product.price}
                                    </h3>

                                    <div className="product-tags">

                                        <span>
                                            {product.category}
                                        </span>

                                        <span>
                                            {product.condition}
                                        </span>

                                    </div>

                                    <button
                                        onClick={() =>
                                            navigate(
                                                `/product/${product.id}`
                                            )
                                        }
                                    >
                                        View Details
                                    </button>

                                </div>

                            </div>

                        ))}

                    </div>

                )}

            </div>

        </div>
    );
}

export default Profile;