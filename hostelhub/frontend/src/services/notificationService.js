import api from "./api";

export async function getNotifications() {
  const res = await api.get("/notifications");
  return res.data;
}

export async function getUnreadNotificationCount() {
  const res = await api.get("/notifications/unread-count");
  return res.data.unread_count;
}

export async function markNotificationAsRead(id) {
  const res = await api.put(`/notifications/${id}/read`);
  return res.data;
}

export async function markAllNotificationsAsRead() {
  const res = await api.put("/notifications/read-all");
  return res.data;
}