import api from "./api";

export async function getWishlist() {
  const res = await api.get("/wishlist");
  return res.data.products;
}

export async function addToWishlist(productId) {
  const res = await api.post(`/wishlist/${productId}`);
  return res.data;
}

export async function removeFromWishlist(productId) {
  const res = await api.delete(`/wishlist/${productId}`);
  return res.data;
}
