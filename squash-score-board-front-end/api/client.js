// src/api/client.js
import axios from "axios";

const client = axios.create({
  baseURL: "http://localhost:8000", // FastAPI 서버 주소
});

client.interceptors.request.use((config) => {
  const token = localStorage.getItem("admin_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default client;
