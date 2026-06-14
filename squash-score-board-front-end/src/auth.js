import client from "../api/client";

const TOKEN_KEY = "admin_token";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function isLoggedIn() {
  return !!getToken();
}

export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export async function login(username, password) {
  const res = await client.post("/auth/login", { username, password });
  setToken(res.data.access_token);
  return res.data;
}

export function logout() {
  clearToken();
}
