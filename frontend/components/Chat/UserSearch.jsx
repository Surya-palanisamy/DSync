"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, User, Loader, AlertCircle } from "lucide-react";
import api from "@/lib/api";

const UserSearch = ({ onClose, onUserSelect }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const abortControllerRef = useRef(null);
  const cacheRef = useRef(new Map());

  const searchUsers = useCallback(async (query) => {
    const trimmed = query.trim();
    if (!trimmed) {
      setUsers([]);
      setError(null);
      setLoading(false);
      return;
    }

    // 1. Instant Cache Lookup (0ms response time for repeated queries)
    if (cacheRef.current.has(trimmed.toLowerCase())) {
      setUsers(cacheRef.current.get(trimmed.toLowerCase()));
      setError(null);
      setLoading(false);
      return;
    }

    // 2. Abort previous in-flight request to prevent race conditions & redundant network load
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    setError(null);

    try {
      const response = await api.get(
        `/auth/users?search=${encodeURIComponent(trimmed)}`,
        { signal: controller.signal }
      );

      if (Array.isArray(response.data)) {
        cacheRef.current.set(trimmed.toLowerCase(), response.data);
        setUsers(response.data);
      } else {
        setUsers([]);
        setError("Invalid response from server");
      }
    } catch (err) {
      if (
        err?.name === "CanceledError" ||
        err?.name === "AbortError" ||
        err?.message === "canceled"
      ) {
        return; // Silently ignore aborted requests
      }

      console.error("Search failed:", err);
      setUsers([]);

      if (err.response?.status === 401) {
        setError("Please log in again to search for users");
      } else if (err.response?.status === 403) {
        setError("You don't have permission to search users");
      } else if (err.response?.status >= 500) {
        setError("Server error. Please try again later.");
      } else {
        setError("Failed to search users. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      searchUsers(searchTerm);
    }, 200);

    return () => {
      clearTimeout(timer);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [searchTerm, searchUsers]);

  const handleClear = () => {
    setSearchTerm("");
    setUsers([]);
    setError(null);
  };

  const handleUserSelect = (userId) => {
    try {
      onUserSelect(userId);
    } catch (error) {
      console.error("Error selecting user:", error);
      setError("Failed to start chat. Please try again.");
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        className="user-search-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="user-search-modal"
          initial={{ scale: 0.95, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 15 }}
          transition={{ duration: 0.18 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="modal-header">
            <h3>Start New Chat</h3>
            <button className="close-btn" onClick={onClose} aria-label="Close modal">
              <X size={20} />
            </button>
          </div>

          <div className="search-input-container">
            <div className="search-input">
              <Search size={20} className="search-icon" />
              <input
                type="text"
                placeholder="Search users by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                autoFocus
              />
              {loading ? (
                <Loader size={18} className="loading-icon animate-spin" />
              ) : searchTerm ? (
                <button
                  type="button"
                  className="clear-search-btn"
                  onClick={handleClear}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#8696a0",
                    cursor: "pointer",
                    padding: "4px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                  title="Clear search"
                >
                  <X size={16} />
                </button>
              ) : null}
            </div>
            {error && (
              <div
                className="error-message"
                style={{
                  color: "#ef4444",
                  fontSize: "14px",
                  marginTop: "8px",
                  padding: "8px 12px",
                  background: "rgba(239, 68, 68, 0.1)",
                  borderRadius: "8px",
                  border: "1px solid rgba(239, 68, 68, 0.2)",
                }}
              >
                {error}
              </div>
            )}
          </div>

          <div className="users-list">
            {loading && users.length === 0 ? (
              <div className="loading-users">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="user-skeleton">
                    <div className="skeleton-avatar"></div>
                    <div className="skeleton-content">
                      <div className="skeleton-line"></div>
                      <div className="skeleton-line short"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="no-users">
                <AlertCircle
                  size={48}
                  className="empty-icon"
                  style={{ color: "#ef4444" }}
                />
                <h4>Search Error</h4>
                <p>{error}</p>
              </div>
            ) : users.length > 0 ? (
              users.map((user, index) => (
                <motion.div
                  key={user._id}
                  className="user-item"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.15, delay: index * 0.04 }}
                  onClick={() => handleUserSelect(user._id)}
                  whileHover={{ scale: 1.01, x: 3 }}
                  whileTap={{ scale: 0.99 }}
                >
                  <div className="user-avatar" style={{ position: "relative" }}>
                    {user.avatar ? (
                      <img
                        src={user.avatar}
                        alt={user.name}
                        onError={(e) => {
                          e.target.style.display = "none";
                          if (e.target.nextSibling) {
                            e.target.nextSibling.style.display = "flex";
                          }
                        }}
                      />
                    ) : null}
                    <div
                      className="avatar-placeholder"
                      style={{ display: user.avatar ? "none" : "flex" }}
                    >
                      <User size={24} />
                    </div>
                    {user.isOnline && (
                      <span
                        style={{
                          position: "absolute",
                          bottom: "2px",
                          right: "2px",
                          width: "10px",
                          height: "10px",
                          backgroundColor: "#22c55e",
                          borderRadius: "50%",
                          border: "2px solid #111111",
                        }}
                        title="Online"
                      />
                    )}
                  </div>
                  <div className="user-info">
                    <h4>{user.name}</h4>
                    <p>{user.email}</p>
                  </div>
                  <div className="user-action">
                    <span>Chat</span>
                  </div>
                </motion.div>
              ))
            ) : searchTerm && !loading ? (
              <div className="no-users">
                <User size={48} className="empty-icon" />
                <h4>No users found</h4>
                <p>Try searching with a different name or email</p>
              </div>
            ) : (
              <div className="search-prompt">
                <Search size={48} className="empty-icon" />
                <h4>Find people to chat with</h4>
                <p>Search for users by their name or email address</p>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default UserSearch;
