import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    "Content-Type": "application/json",
  },
});

// Attach JWT to every request if present
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("hostelhub_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Normalize errors and handle expired/invalid sessions globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (!error.response) {
      return Promise.reject({
        message: "Unable to connect to HostelHub. Please check your connection and try again.",
      });
    }

    const { status, data } = error.response;

    if (status === 401) {
      localStorage.removeItem("hostelhub_token");
      localStorage.removeItem("hostelhub_user");
      // Let components decide navigation; just surface a clear message.
      return Promise.reject({
        message: data?.error || "Your session has expired. Please log in again.",
        status,
        fields: data?.fields,
        sessionExpired: true,
      });
    }

    return Promise.reject({
      message: data?.error || "Something went wrong. Please try again.",
      status,
      fields: data?.fields,
    });
  }
);

export default api;
