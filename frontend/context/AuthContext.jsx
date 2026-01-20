"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import api from "@/lib/api";

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

const COOKIE_NAME = "dsync_user";

const setUserCookie = (user, days = 30) => {
  if (typeof window === "undefined") return;
  try {
    const maxAge = days * 24 * 60 * 60;
    const value = encodeURIComponent(JSON.stringify(user));
    document.cookie = `${COOKIE_NAME}=${value}; Max-Age=${maxAge}; Path=/; SameSite=None; Secure`;
  } catch (e) {
    console.error("Failed to set user cookie:", e);
  }
};

const getUserCookie = () => {
  if (typeof window === "undefined") return null;
  try {
    const cookies = document.cookie ? document.cookie.split("; ") : [];
    for (const c of cookies) {
      const [name, ...rest] = c.split("=");
      if (name === COOKIE_NAME) {
        const value = rest.join("=");
        return JSON.parse(decodeURIComponent(value));
      }
    }
  } catch (e) {
    console.error("Failed to parse user cookie:", e);
  }
  return null;
};

const deleteUserCookie = () => {
  if (typeof window === "undefined") return;
  try {
    document.cookie = `${COOKIE_NAME}=; Max-Age=0; Path=/; SameSite=None; Secure`;
  } catch (e) {
    console.error("Failed to delete user cookie:", e);
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const verifyWithServer = useCallback(async () => {
    setVerifying(true);
    try {
      const response = await api.get("/auth/me");
      if (response.data.success && response.data.user) {
        const userData = response.data.user;
        setUser(userData);
        localStorage.setItem("user", JSON.stringify(userData));
        setUserCookie(userData);
      } else {
        setUser(null);
        localStorage.removeItem("user");
        deleteUserCookie();
      }
    } catch (error) {
      // Only log unexpected errors (not 401 which is expected when not logged in)
      if (error.response?.status !== 401) {
        console.error(
          "Auth verification failed:",
          error.response?.data?.message || error.message,
        );
      }
      setUser(null);
      localStorage.removeItem("user");
      deleteUserCookie();
    } finally {
      setVerifying(false);
    }
  }, []);

  const initializeAuth = useCallback(() => {
    if (typeof window === "undefined") return;

    let storedUser = null;
    try {
      const raw = localStorage.getItem("user");
      if (raw) storedUser = JSON.parse(raw);
    } catch (e) {
      console.error("Error parsing stored user data from localStorage:", e);
      localStorage.removeItem("user");
    }

    if (!storedUser) {
      const cookieUser = getUserCookie();
      if (cookieUser) {
        storedUser = cookieUser;
        try {
          localStorage.setItem("user", JSON.stringify(cookieUser));
        } catch (e) {
          console.warn(
            "localStorage set failed, continuing with cookie-only user",
          );
        }
      }
    }

    if (storedUser) setUser(storedUser);

    setInitialized(true);
    verifyWithServer();
  }, [verifyWithServer]);

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  const login = async (email, password) => {
    setLoading(true);
    try {
      const response = await api.post("/auth/login", {
        email: email.trim(),
        password,
      });

      if (response.data.success && response.data.user) {
        const userData = response.data.user;
        setUser(userData);
        localStorage.setItem("user", JSON.stringify(userData));
        setUserCookie(userData);
        return response.data;
      } else {
        throw new Error(response.data.message || "Login failed");
      }
    } catch (error) {
      console.error("Login error:", error);
      localStorage.removeItem("user");
      deleteUserCookie();
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const register = async (name, email, password) => {
    setLoading(true);
    try {
      const response = await api.post("/auth/register", {
        name: name.trim(),
        email: email.trim(),
        password,
      });

      if (response.data.success && response.data.user) {
        const userData = response.data.user;
        setUser(userData);
        localStorage.setItem("user", JSON.stringify(userData));
        setUserCookie(userData);
        return response.data;
      } else {
        throw new Error(response.data.message || "Registration failed");
      }
    } catch (error) {
      console.error("Registration error:", error);
      localStorage.removeItem("user");
      deleteUserCookie();
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (profileData) => {
    setLoading(true);
    try {
      const response = await api.put("/auth/profile", profileData);
      if (response.data.success && response.data.user) {
        const userData = response.data.user;
        setUser(userData);
        localStorage.setItem("user", JSON.stringify(userData));
        setUserCookie(userData);
        return response.data;
      }
    } catch (error) {
      console.error("Update profile error:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const uploadAvatar = async (file) => {
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("avatar", file);

      const response = await api.post("/auth/avatar", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      if (response.data.success && response.data.user) {
        const userData = response.data.user;
        setUser(userData);
        localStorage.setItem("user", JSON.stringify(userData));
        setUserCookie(userData);
        return response.data;
      }
    } catch (error) {
      console.error("Avatar upload error:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = useCallback(async () => {
    try {
      await api.post("/auth/logout");
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setUser(null);
      localStorage.removeItem("user");
      deleteUserCookie();
      window.location.replace("/login");
    }
  }, []);

  const value = {
    user,
    login,
    register,
    updateProfile,
    uploadAvatar,
    logout,
    loading,
    initialized,
    verifying,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
