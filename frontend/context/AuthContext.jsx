"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
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

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const abortControllerRef = useRef(null);

  const verifyWithServer = useCallback(async (retryCount = 0) => {
    // Cancel any in-flight verification
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setVerifying(true);
    try {
      const response = await api.get("/auth/me", {
        signal: controller.signal,
      });
      if (response.data.success && response.data.user) {
        const userData = response.data.user;
        setUser(userData);
        localStorage.setItem("user", JSON.stringify(userData));
      } else {
        setUser(null);
        localStorage.removeItem("user");
      }
    } catch (error) {
      // Don't handle aborted requests
      if (error.name === "CanceledError" || error.name === "AbortError") {
        return;
      }

      // Only log unexpected errors (not 401 which is expected when not logged in)
      if (error.response?.status !== 401) {
        console.error(
          "Auth verification failed:",
          error.response?.data?.message || error.message,
        );

        // Retry once on network error (not on 4xx/5xx)
        if (!error.response && retryCount < 1) {
          setTimeout(() => verifyWithServer(retryCount + 1), 3000);
          return;
        }
      }
      setUser(null);
      localStorage.removeItem("user");
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

    if (storedUser) setUser(storedUser);

    setInitialized(true);
    setLoading(false);
    verifyWithServer();
  }, [verifyWithServer]);

  useEffect(() => {
    initializeAuth();

    // Cleanup: abort any in-flight verification on unmount
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
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
        return response.data;
      } else {
        throw new Error(response.data.message || "Login failed");
      }
    } catch (error) {
      console.error("Login error:", error);
      localStorage.removeItem("user");
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
        return response.data;
      } else {
        throw new Error(response.data.message || "Registration failed");
      }
    } catch (error) {
      console.error("Registration error:", error);
      localStorage.removeItem("user");
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
    }
  }, []);

  // Memoize context value to prevent unnecessary re-renders of all consumers
  const value = useMemo(
    () => ({
      user,
      login,
      register,
      updateProfile,
      uploadAvatar,
      logout,
      loading,
      initialized,
      verifying,
    }),
    [user, logout, loading, initialized, verifying],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
