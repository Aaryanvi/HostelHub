import api from "./api";

export async function getProducts(filters = {}) {
  const params = {};
  if (filters.search) params.search = filters.search;
  if (filters.category && filters.category !== "All") params.category = filters.category;
  if (filters.condition && filters.condition !== "All") params.condition = filters.condition;
  if (filters.minPrice) params.min_price = filters.minPrice;
  if (filters.maxPrice) params.max_price = filters.maxPrice;
  if (filters.sort) params.sort = filters.sort;
  if (filters.limit) params.limit = filters.limit;
  if (filters.page) params.page = filters.page;
  if (filters.perPage) params.per_page = filters.perPage;

  const res = await api.get("/products", { params });
  return res.data; // { products, count, page, per_page, has_more }
}

export async function getProduct(id) {
  const res = await api.get(`/products/${id}`);
  return res.data.product;
}

export async function createProduct(payload) {
  const res = await api.post("/products", payload);
  return res.data.product;
}

export async function updateProduct(id, payload) {
  const res = await api.put(`/products/${id}`, payload);
  return res.data.product;
}

export async function markProductSold(id) {
  const res = await api.put(`/products/${id}`, { status: "sold" });
  return res.data.product;
}

export async function relistProduct(id) {
  const res = await api.put(`/products/${id}`, { status: "available" });
  return res.data.product;
}

export async function deleteProduct(id) {
  await api.delete(`/products/${id}`);
}

export async function getMyProducts() {
  const res = await api.get("/products/mine");
  return res.data.products;
}

export async function getCategories() {
  const res = await api.get("/products/categories");
  return res.data.categories;
}

export async function getPriceSuggestion(category, condition) {
  const res = await api.get("/products/price-suggestion", { params: { category, condition } });
  return res.data.suggestion; // null when there isn't enough data
}

export async function uploadImage(file) {
  const formData = new FormData();
  formData.append("image", file);
  const res = await api.post("/uploads", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data; // { path, url }
}

export async function getImpactStats() {
  const res = await api.get("/impact/stats");
  return res.data;
}

export async function createImpactTransaction(payload) {
  const res = await api.post("/impact/transactions", payload);
  return res.data.transaction;
}

export async function getImpactTransactions() {
  const res = await api.get("/impact/transactions");
  return res.data.transactions;
}

export async function confirmImpactTransaction(id) {
  const res = await api.post(`/impact/transactions/${id}/confirm`);
  return res.data.transaction;
}

export async function rejectImpactTransaction(id) {
  const res = await api.post(`/impact/transactions/${id}/reject`);
  return res.data.transaction;
}