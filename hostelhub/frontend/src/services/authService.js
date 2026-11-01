import api from "./api";

const TOKEN_KEY = "hostelhub_token";
const USER_KEY = "hostelhub_user";

export function saveSession(token, user) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function getStoredUser() {
  const raw = localStorage.getItem(USER_KEY);
  return raw ? JSON.parse(raw) : null;
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export async function register(payload) {
  const res = await api.post("/auth/register", payload);
  saveSession(res.data.token, res.data.user);
  return res.data.user;
}

export async function login(email, password) {
  const res = await api.post("/auth/login", { email, password });
  saveSession(res.data.token, res.data.user);
  return res.data.user;
}

export function logout() {
  clearSession();
}

export async function fetchCurrentUser() {
  const res = await api.get("/auth/me");
  return res.data.user;
}

export async function updateProfile(payload) {
  const res = await api.put("/auth/profile", payload);
  const user = res.data.user;
  const existing = getStoredUser();
  saveSession(getToken(), { ...existing, ...user });
  return user;
}

export async function getAuthConfig() {
  const res = await api.get("/auth/config");
  return res.data.allowed_email_domains || [];
}
