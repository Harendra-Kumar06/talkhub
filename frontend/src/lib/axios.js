import axios from "axios";

const BASE_URL = import.meta.env.MODE === "development"
  ? "/api"
  : "https://talkhub-vr09.onrender.com/api";

export const axiosInstance = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
});
