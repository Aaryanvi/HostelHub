import api from "./api";

export async function sendMessage({ productId, body, receiverId }) {
  const res = await api.post("/messages", {
    product_id: productId,
    body,
    receiver_id: receiverId,
  });
  return res.data.message;
}

export async function getConversations() {
  const res = await api.get("/messages/conversations");
  return res.data.conversations;
}

export async function getThread(productId, userId) {
  const res = await api.get("/messages/thread", {
    params: { product_id: productId, user_id: userId },
  });
  return res.data; // { product, other_user, messages }
}

export async function getUnreadCount() {
  const res = await api.get("/messages/unread-count");
  return res.data.unread;
}
