import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./Products.css";

function Products() {
    const [products, setProducts] = useState([]);
    const [search, setSearch] = useState("");
    const [category, setCategory] = useState("All");
    const [loading, setLoading] = useState(true);

    const navigate = useNavigate();

    // Fetch products from Flask backend
    useEffect(() => {
        fetchProducts();
    }, []);

    const fetchProducts = async () => {
        try {
            const response = await axios.get(
                "http://localhost:5000/api/products"
            );

            setProducts(response.data.products || []);
        } catch (error) {
            console.error("Error fetching products:", error);
        } finally {
            setLoading(false);
        }
    };

    // Filter products
    const filteredProducts = products.filter((product) => {
        const matchesSearch =
            product.title
                ?.toLowerCase()
                .includes(search.toLowerCase()) ||
            product.description
                ?.toLowerCase()
                .includes(search.toLowerCase());

        const matchesCategory =
            category === "All" || product.category === category;

        return matchesSearch && matchesCategory;
    });

    // Get unique categories
    const categories = [
        "All",
        ...new Set(products.map((product) => product.category)),
    ];

    if (loading) {
        return <div className="loading">Loading HostelHub...</div>;
    }

    return (
        <div className="products-page">

            {/* Header */}
            <div className="marketplace-header">
                <div>
                    <h1>HostelHub Marketplace</h1>
                    <p>
                        Buy, sell and exchange items within your campus.
                    </p>
                </div>

                <button
                    className="add-product-btn"
                    onClick={() => navigate("/add-product")}
                >
                    + Sell an Item
                </button>
            </div>

            {/* Search & Filters */}
            <div className="filters">

                <input
                    type="text"
                    className="search-input"
                    placeholder="Search products..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />

                <select
                    className="category-select"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                >
                    {categories.map((cat) => (
                        <option key={cat} value={cat}>
                            {cat}
                        </option>
                    ))}
                </select>

            </div>

            {/* Products */}
            {filteredProducts.length === 0 ? (
                <div className="no-products">
                    <h2>No products found</h2>
                    <p>Try another search or category.</p>
                </div>
            ) : (
                <div className="products-grid">

                    {filteredProducts.map((product) => (

                        <div
                            className="product-card"
                            key={product.id}
                        >

                            {/* Product image placeholder */}
                            <div className="product-image">
                                📦
                            </div>

                            <div className="product-content">

                                <div className="product-title">
                                    {product.title}
                                </div>

                                <div className="product-description">
                                    {product.description}
                                </div>

                                <div className="product-price">
                                    ₹{product.price}
                                </div>

                                <div className="product-meta">

                                    <span className="badge">
                                        {product.category}
                                    </span>

                                    <span className="badge">
                                        {product.condition}
                                    </span>

                                </div>

                                <button
                                    className="details-btn"
                                    onClick={() =>
                                        navigate(`/product/${product.id}`)
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
    );
}

export default Products;