import { Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ToastProvider } from "./context/ToastContext";
import ProtectedRoute from "./ProtectedRoute";

import Navbar from "./components/Navbar";
import Footer from "./components/Footer";

import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Marketplace from "./pages/Marketplace";
import ProductDetails from "./pages/ProductDetails";
import AddProduct from "./pages/AddProduct";
import Profile from "./pages/Profile";
import SavedItems from "./pages/SavedItems";
import Inbox from "./pages/Inbox";
import Admin from "./pages/Admin";
import ImpactDashboard from "./pages/ImpactDashboard";
import Notifications from "./pages/Notifications";

function NotFound() {
  return (
    <div className="container" style={{ padding: "64px 20px", textAlign: "center" }}>
      <h1 style={{ fontSize: 24, marginBottom: 8 }}>Page not found</h1>
      <p style={{ color: "var(--text-muted)" }}>The page you're looking for doesn't exist.</p>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <div className="app-shell">
          <Navbar />
          <main className="app-main">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/marketplace" element={<Marketplace />} />
              <Route path="/product/:id" element={<ProductDetails />} />

              <Route path="/add-product" element={<ProtectedRoute><AddProduct /></ProtectedRoute>} />
              <Route path="/edit-product/:id" element={<ProtectedRoute><AddProduct /></ProtectedRoute>} />
              <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
              <Route path="/saved" element={<ProtectedRoute><SavedItems /></ProtectedRoute>} />
              <Route path="/inbox" element={<ProtectedRoute><Inbox /></ProtectedRoute>} />
              <Route path="/inbox/:productId/:userId" element={<ProtectedRoute><Inbox /></ProtectedRoute>} />
              <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
              <Route path="/impact"element={<ProtectedRoute> <ImpactDashboard /></ProtectedRoute>}/>
              <Route
  path="/notifications"
  element={
    <ProtectedRoute>
      <Notifications />
    </ProtectedRoute>
  }
/>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </ToastProvider>
    </AuthProvider>
  );
}
