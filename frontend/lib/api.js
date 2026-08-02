import axios from "axios";

const API_URL = (() => {
  if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL;
  if (typeof window === "undefined") return "http://localhost:5000/api";

  const isSecure = window.location.protocol === "https:";
  const host = window.location.hostname;
  const defaultPort = isSecure ? "" : ":5000";
  const port = process.env.NEXT_PUBLIC_API_PORT
    ? `:${process.env.NEXT_PUBLIC_API_PORT}`
    : defaultPort;
  const protocol = isSecure ? "https:" : "http:";
  return `${protocol}//${host}${port}/api`;
})();

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
    // Removed "Access-Control-Allow-Credentials" — that's a response header, not a request header
  },
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Ignore canceled/aborted requests (e.g. React Strict Mode, component unmounts, AbortController)
    if (
      axios.isCancel(error) ||
      error.name === "CanceledError" ||
      error.name === "AbortError" ||
      error.message === "canceled"
    ) {
      return Promise.reject(error);
    }

    // Skip verbose logging for expected auth failures (401 on /auth/me)
    const isAuthCheck = error.config?.url?.includes("/auth/me");
    const is401 = error.response?.status === 401;

    // Auto-retry once on 5xx errors (with exponential backoff)
    if (
      error.response?.status >= 500 &&
      error.config &&
      !error.config._retried
    ) {
      error.config._retried = true;
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return api.request(error.config);
    }

    // Only log non-auth-check errors or non-401 errors
    if (!isAuthCheck || !is401) {
      if (error.response) {
        console.error(
          `API Error [${error.response?.status}]:`,
          error.config?.url,
          error.response?.data?.message || error.message,
        );
      } else if (error.request) {
        console.error(
          "Network Error:",
          error.config?.url,
          error.message || error.code,
        );
      } else {
        console.error("Request Setup Error:", error.message);
      }
    }

    if (typeof window !== "undefined") {
      if (error.response?.status === 401) {
        const currentPath = window.location.pathname;
        const isPublicPage =
          currentPath === "/" ||
          currentPath === "/login" ||
          currentPath === "/register";
        const isAuthCheckUrl = error.config?.url?.includes("/auth/me");
        if (!isPublicPage && !isAuthCheckUrl) {
          localStorage.removeItem("user");
          window.location.href = "/login";
        }
      }
    }

    return Promise.reject(error);
  },
);

export default api;
