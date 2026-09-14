import api from "./api";


// Register
export const registerUser = async (userData) => {

    const response = await api.post(
        "/auth/register",
        userData
    );

    return response.data;
};


// Login
export const loginUser = async (loginData) => {

    const response = await api.post(
        "/auth/login",
        loginData
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

    return response.data;
};


// Logout
export const logoutUser = () => {

    localStorage.removeItem("token");
    localStorage.removeItem("user");
};