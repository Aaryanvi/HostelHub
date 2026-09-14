import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

function Register() {
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        name: "",
        email: "",
        password: "",
        phone: "",
        hostel: "",
        branch: "",
        year: ""
    });

    const [message, setMessage] = useState("");
    const [error, setError] = useState("");

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        setMessage("");
        setError("");

        try {
            const response = await axios.post(
                "http://localhost:5000/api/auth/register",
                {
                    ...formData,
                    year: Number(formData.year)
                }
            );

            setMessage(response.data.message);

            // Go to login after successful registration
            setTimeout(() => {
                navigate("/login");
            }, 1000);

        } catch (err) {
            console.error(err);

            if (err.response) {
                setError(
                    err.response.data.message || "Registration failed"
                );
            } else {
                setError("Unable to connect to server");
            }
        }
    };

    return (
        <div style={styles.container}>
            <div style={styles.card}>
                <h1>HostelHub</h1>
                <h2>Create Account</h2>

                <form onSubmit={handleSubmit}>

                    <input
                        type="text"
                        name="name"
                        placeholder="Full Name"
                        value={formData.name}
                        onChange={handleChange}
                        required
                    />

                    <input
                        type="email"
                        name="email"
                        placeholder="Email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                    />

                    <input
                        type="password"
                        name="password"
                        placeholder="Password"
                        value={formData.password}
                        onChange={handleChange}
                        required
                    />

                    <input
                        type="text"
                        name="phone"
                        placeholder="Phone Number"
                        value={formData.phone}
                        onChange={handleChange}
                    />

                    <input
                        type="text"
                        name="hostel"
                        placeholder="Hostel"
                        value={formData.hostel}
                        onChange={handleChange}
                        required
                    />

                    <input
                        type="text"
                        name="branch"
                        placeholder="Branch (e.g. CSE)"
                        value={formData.branch}
                        onChange={handleChange}
                        required
                    />

                    <input
                        type="number"
                        name="year"
                        placeholder="Year (1-4)"
                        value={formData.year}
                        onChange={handleChange}
                        required
                    />

                    <button type="submit">
                        Register
                    </button>
                </form>

                {message && (
                    <p style={{ color: "green" }}>
                        {message}
                    </p>
                )}

                {error && (
                    <p style={{ color: "red" }}>
                        {error}
                    </p>
                )}

                <p>
                    Already have an account?{" "}
                    <button
                        type="button"
                        onClick={() => navigate("/login")}
                        style={styles.linkButton}
                    >
                        Login
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
        background: "#f5f5f5"
    },

    card: {
        width: "400px",
        padding: "30px",
        background: "white",
        borderRadius: "12px",
        boxShadow: "0 4px 15px rgba(0,0,0,0.1)"
    }
};

export default Register;