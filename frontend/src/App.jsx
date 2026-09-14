import { BrowserRouter, Routes, Route } from "react-router-dom";

import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Products from "./pages/Products";
import ProductDetails from "./pages/ProductDetails";
import AddProduct from "./pages/AddProduct";
import Profile from "./pages/Profile";

function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />

                {/* Marketplace - all products */}
                <Route path="/products" element={<Products />} />

                {/* Single product */}
                <Route path="/product/:id" element={<ProductDetails />} />

                {/* Add a product */}
                <Route path="/add-product" element={<AddProduct />} />

                {/* User profile */}
                <Route path="/profile" element={<Profile />} />
            </Routes>
        </BrowserRouter>
    );
}

export default App;