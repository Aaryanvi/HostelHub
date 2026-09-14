import api from "./api";


// Get all products
export const getProducts = async () => {

    const response = await api.get("/products");

    return response.data;
};


// Get single product
export const getProduct = async (id) => {

    const response = await api.get(
        `/products/${id}`
    );

    return response.data;
};


// Add product
export const createProduct = async (productData) => {

    const response = await api.post(
        "/products",
        productData
    );

    return response.data;
};


// Update product
export const updateProduct = async (id, productData) => {

    const response = await api.put(
        `/products/${id}`,
        productData
    );

    return response.data;
};


// Delete product
export const deleteProduct = async (id) => {

    const response = await api.delete(
        `/products/${id}`
    );

    return response.data;
};