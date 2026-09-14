import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

function Login() {
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        email: "",
        password: ""
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
            const response = await axios.post(
                "http://localhost:5000/api/auth/login",
                formData
            );

            // Save JWT token
            localStorage.setItem(
                "token",
                response.data.access_token
            );

            // Save user information
            localStorage.setItem(
                "user",
                JSON.stringify(response.data.user)
            );

            // Go to marketplace
            navigate("/products");

        } catch (err) {
            console.error(err);

            if (err.response) {
                setError(
                    err.response.data.message ||
                    "Invalid email or password"
                );
            } else {
                setError(
                    "Unable to connect to server"
                );
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={styles.container}>

            <div style={styles.card}>

                <h1>HostelHub</h1>

                <h2>Login</h2>

                <p style={styles.subtitle}>
                    Login to your HostelHub account
                </p>

                <form onSubmit={handleSubmit}>

                    <input
                        type="email"
                        name="email"
                        placeholder="Email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                        style={styles.input}
                    />

                    <input
                        type="password"
                        name="password"
                        placeholder="Password"
                        value={formData.password}
                        onChange={handleChange}
                        required
                        style={styles.input}
                    />

                    <button
                        type="submit"
                        style={styles.button}
                        disabled={loading}
                    >
                        {loading ? "Logging in..." : "Login"}
                    </button>

                </form>

                {error && (
                    <p style={styles.error}>
                        {error}
                    </p>
                )}

                <p style={styles.registerText}>
                    Don't have an account?{" "}

                    <button
                        type="button"
                        onClick={() => navigate("/register")}
                        style={styles.linkButton}
                    >
                        Register
                    </button>
                </p>

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
        background: "#f5f7fb"
    },

    card: {
        width: "380px",
        padding: "35px",
        background: "white",
        borderRadius: "12px",
        boxShadow: "0 4px 20px rgba(0,0,0,0.1)"
    },

    subtitle: {
        color: "#666",
        marginBottom: "25px"
    },

    input: {
        width: "100%",
        boxSizing: "border-box",
        padding: "12px",
        marginBottom: "15px",
        border: "1px solid #ddd",
        borderRadius: "7px",
        fontSize: "15px"
    },

    button: {
        width: "100%",
        padding: "12px",
        background: "#6c3df5",
        color: "white",
        border: "none",
        borderRadius: "7px",
        fontSize: "16px",
        cursor: "pointer"
    },

    error: {
        color: "red",
        marginTop: "15px"
    },

    registerText: {
        marginTop: "20px",
        textAlign: "center"
    },

    linkButton: {
        border: "none",
        background: "none",
        color: "#6c3df5",
        cursor: "pointer",
        fontWeight: "bold"
    }
};


export default Login;