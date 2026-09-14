import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

function AddProduct() {
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        title: "",
        description: "",
        price: "",
        category: "Academic",
        condition: "Good"
    });

    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        setError("");
        setLoading(true);

        try {
            const token = localStorage.getItem("token");

            if (!token) {
                setError("Please login before adding a product.");
                setLoading(false);
                return;
            }

            await axios.post(
                "http://localhost:5000/api/products",
                {
                    title: formData.title,
                    description: formData.description,
                    price: Number(formData.price),
                    category: formData.category,
                    condition: formData.condition
                },
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json"
                    }
                }
            );

            // Product created successfully
            navigate("/products");

        } catch (err) {
            console.error("Error adding product:", err);

            if (err.response) {
                setError(
                    err.response.data.message ||
                    "Failed to add product"
                );
            } else {
                setError("Unable to connect to server");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={styles.container}>

            <div style={styles.card}>

                <button
                    type="button"
                    onClick={() => navigate("/products")}
                    style={styles.backButton}
                >
                    ← Back to Marketplace
                </button>

                <h1>Sell an Item</h1>

                <p style={styles.subtitle}>
                    List an item for students on HostelHub
                </p>

                <form onSubmit={handleSubmit}>

                    <label>Product Title</label>

                    <input
                        type="text"
                        name="title"
                        placeholder="e.g. Scientific Calculator"
                        value={formData.title}
                        onChange={handleChange}
                        required
                        style={styles.input}
                    />

                    <label>Description</label>

                    <textarea
                        name="description"
                        placeholder="Describe the item..."
                        value={formData.description}
                        onChange={handleChange}
                        required
                        style={styles.textarea}
                    />

                    <label>Price</label>

                    <input
                        type="number"
                        name="price"
                        placeholder="Enter price"
                        min="0"
                        value={formData.price}
                        onChange={handleChange}
                        required
                        style={styles.input}
                    />

                    <label>Category</label>

                    <select
                        name="category"
                        value={formData.category}
                        onChange={handleChange}
                        style={styles.input}
                    >
                        <option value="Academic">
                            Academic
                        </option>

                        <option value="Electronics">
                            Electronics
                        </option>

                        <option value="Furniture">
                            Furniture
                        </option>

                        <option value="Clothing">
                            Clothing
                        </option>

                        <option value="Books">
                            Books
                        </option>

                        <option value="Sports">
                            Sports
                        </option>

                        <option value="Other">
                            Other
                        </option>
                    </select>

                    <label>Condition</label>

                    <select
                        name="condition"
                        value={formData.condition}
                        onChange={handleChange}
                        style={styles.input}
                    >
                        <option value="New">
                            New
                        </option>

                        <option value="Like New">
                            Like New
                        </option>

                        <option value="Good">
                            Good
                        </option>

                        <option value="Used">
                            Used
                        </option>
                    </select>

                    <button
                        type="submit"
                        disabled={loading}
                        style={styles.submitButton}
                    >
                        {loading
                            ? "Adding Product..."
                            : "List Item"}
                    </button>

                </form>

                {error && (
                    <p style={styles.error}>
                        {error}
                    </p>
                )}

            </div>

        </div>
    );
}

const styles = {

    container: {
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        background: "#f5f7fb",
        padding: "30px"
    },

    card: {
        width: "500px",
        background: "white",
        padding: "35px",
        borderRadius: "15px",
        boxShadow: "0 5px 20px rgba(0,0,0,0.08)"
    },

    backButton: {
        border: "none",
        background: "transparent",
        cursor: "pointer",
        marginBottom: "20px",
        fontSize: "14px"
    },

    subtitle: {
        color: "#666",
        marginBottom: "25px"
    },

    input: {
        width: "100%",
        boxSizing: "border-box",
        padding: "12px",
        marginTop: "7px",
        marginBottom: "18px",
        border: "1px solid #ddd",
        borderRadius: "7px",
        fontSize: "15px"
    },

    textarea: {
        width: "100%",
        boxSizing: "border-box",
        height: "100px",
        padding: "12px",
        marginTop: "7px",
        marginBottom: "18px",
        border: "1px solid #ddd",
        borderRadius: "7px",
        fontSize: "15px",
        resize: "vertical"
    },

    submitButton: {
        width: "100%",
        padding: "13px",
        background: "#6c3df5",
        color: "white",
        border: "none",
        borderRadius: "8px",
        fontSize: "16px",
        cursor: "pointer",
        marginTop: "10px"
    },

    error: {
        color: "red",
        marginTop: "15px",
        textAlign: "center"
    }
};

export default AddProduct;