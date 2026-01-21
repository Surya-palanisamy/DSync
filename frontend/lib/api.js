import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
    "Access-Control-Allow-Credentials": "true",
  },
});

api.interceptors.request.use(
  (config) => {
    return config;
  },
  (error) => {
    console.error("Request interceptor error:", error);
    return Promise.reject(error);
  },
);

api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Skip verbose logging for expected auth failures (401 on /auth/me)
    const isAuthCheck = error.config?.url?.includes("/auth/me");
    const is401 = error.response?.status === 401;

    // Only log non-auth-check errors or non-401 errors
    if (!isAuthCheck || !is401) {
      if (error.response) {
        // Server responded with error status
        console.error(
          `API Error [${error.response?.status}]:`,
          error.config?.url,
          error.response?.data?.message || error.message,
        );
      } else if (error.request) {
        // Request was made but no response received (network error, CORS, server down)
        console.error(
          "Network Error:",
          error.config?.url,
          error.message || error.code,
        );
      } else {
        // Error in setting up the request
        console.error("Request Setup Error:", error.message);
      }
    }

    if (typeof window !== "undefined") {
      if (error.response?.status === 401) {
        const currentPath = window.location.pathname;
        // Don't redirect on public pages (home, login, register) or during auth check
        const isPublicPage =
          currentPath === "/" ||
          currentPath === "/login" ||
          currentPath === "/register";
        const isAuthCheck = error.config?.url?.includes("/auth/me");
        if (!isPublicPage && !isAuthCheck) {
          localStorage.removeItem("user");
          window.location.href = "/login";
        }
      } else if (error.response?.status === 403) {
        console.log("Forbidden access");
      } else if (error.response?.status >= 500) {
        console.log("Server error");
      } else if (error.code === "ECONNABORTED") {
        console.log("Request timeout");
      } else if (!error.response) {
        console.log(
          "Network error - check if backend server is running at:",
          API_URL,
        );
      }
    }

    return Promise.reject(error);
  },
);

export default api;
