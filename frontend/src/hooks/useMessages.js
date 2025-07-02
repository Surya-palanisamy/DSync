"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import api from "../utils/api";

export const useMessages = (chatId) => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const optimisticMessagesRef = useRef(new Map());

  // Load messages when chatId changes
  useEffect(() => {
    if (chatId) {
      fetchMessages();
    } else {
      setMessages([]);
      optimisticMessagesRef.current.clear();
    }
  }, [chatId]);

  const fetchMessages = useCallback(async () => {
    if (!chatId) return;

    setLoading(true);
    try {
      const response = await api.get(`/message/${chatId}`);
      setMessages(response.data);
    } catch (error) {
      console.error("Failed to fetch messages:", error);
    } finally {
      setLoading(false);
    }
  }, [chatId]);

  const generateOptimisticId = () =>
    `optimistic_${Date.now()}_${Math.random()}`;

  const sendMessage = useCallback(
    async (content, messageType = "text", file = null, replyTo = null) => {
      if (!chatId || (!content?.trim() && !file)) return;

      const optimisticId = generateOptimisticId();
      const currentUser = JSON.parse(
        document.cookie
          .split("; ")
          .find((row) => row.startsWith("user="))
          ?.split("=")[1] || "{}"
      ) || { id: "temp", name: "You", avatar: "" };

      // Create optimistic message
      const optimisticMessage = {
        _id: optimisticId,
        content: content || (file ? file.name : ""),
        messageType,
        sender: {
          _id: currentUser.id,
          name: currentUser.name,
          avatar: currentUser.avatar,
        },
        chat: chatId,
        createdAt: new Date().toISOString(),
        replyTo,
        likes: [],
        readBy: [],
        deliveredTo: [],
        isOptimistic: true,
        status: "sending",
      };

      // Add optimistic message immediately
      setMessages((prev) => [...prev, optimisticMessage]);
      optimisticMessagesRef.current.set(optimisticId, optimisticMessage);

      try {
        let response;

        if (file) {
          const formData = new FormData();
          formData.append("file", file);
          formData.append("chatId", chatId);
          if (replyTo) formData.append("replyTo", replyTo._id);

          response = await api.post("/message/upload", formData, {
            headers: { "Content-Type": "multipart/form-data" },
          });
        } else {
          const payload = {
            content: content.trim(),
            chatId,
            messageType,
          };

          if (replyTo) payload.replyTo = replyTo._id;
          response = await api.post("/message", payload);
        }

        const realMessage = response.data;

        // Replace optimistic message with real message
        setMessages((prev) => {
          return prev.map((msg) =>
            msg._id === optimisticId ? { ...realMessage, status: "sent" } : msg
          );
        });

        optimisticMessagesRef.current.delete(optimisticId);
        return realMessage;
      } catch (error) {
        console.error("Failed to send message:", error);

        // Mark optimistic message as failed
        setMessages((prev) =>
          prev.map((msg) =>
            msg._id === optimisticId ? { ...msg, status: "failed" } : msg
          )
        );

        throw error;
      }
    },
    [chatId]
  );

  const editMessage = useCallback(
    async (messageId, newContent) => {
      // Optimistic update
      const originalMessage = messages.find((msg) => msg._id === messageId);
      setMessages((prev) => {
        return prev.map((msg) =>
          msg._id === messageId
            ? { ...msg, content: newContent, isEdited: true }
            : msg
        );
      });

      try {
        const response = await api.put(`/message/${messageId}/edit`, {
          content: newContent,
        });

        return response.data;
      } catch (error) {
        console.error("Failed to edit message:", error);

        // Revert optimistic update
        if (originalMessage) {
          setMessages((prev) => {
            return prev.map((msg) =>
              msg._id === messageId ? originalMessage : msg
            );
          });
        }

        throw error;
      }
    },
    [messages]
  );

  const deleteMessage = useCallback(
    async (messageId) => {
      // Optimistic update - remove message immediately
      const messageToDelete = messages.find((msg) => msg._id === messageId);
      setMessages((prev) => prev.filter((msg) => msg._id !== messageId));

      try {
        await api.delete(`/message/${messageId}`);
      } catch (error) {
        console.error("Failed to delete message:", error);

        // Revert optimistic update
        if (messageToDelete) {
          setMessages((prev) => {
            const updated = [...prev, messageToDelete].sort(
              (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
            );
            return updated;
          });
        }

        throw error;
      }
    },
    [messages]
  );

  const likeMessage = useCallback(
    async (messageId) => {
      const currentUser = JSON.parse(
        document.cookie
          .split("; ")
          .find((row) => row.startsWith("user="))
          ?.split("=")[1] || "{}"
      ) || { id: "temp" };

      // Optimistic update
      const originalMessage = messages.find((msg) => msg._id === messageId);
      setMessages((prev) => {
        return prev.map((msg) => {
          if (msg._id === messageId) {
            const likes = msg.likes || [];
            const isLiked = likes.includes(currentUser.id);
            const newLikes = isLiked
              ? likes.filter((id) => id !== currentUser.id)
              : [...likes, currentUser.id];
            return { ...msg, likes: newLikes };
          }
          return msg;
        });
      });

      try {
        const response = await api.put(`/message/${messageId}/like`);
        const { likes } = response.data;

        // Update with server response
        setMessages((prev) => {
          return prev.map((msg) =>
            msg._id === messageId ? { ...msg, likes } : msg
          );
        });

        return likes;
      } catch (error) {
        console.error("Failed to like message:", error);

        // Revert optimistic update
        if (originalMessage) {
          setMessages((prev) => {
            return prev.map((msg) =>
              msg._id === messageId ? originalMessage : msg
            );
          });
        }

        throw error;
      }
    },
    [messages]
  );

  const markAsRead = useCallback(async (messageId) => {
    try {
      await api.put(`/message/${messageId}/read`);
    } catch (error) {
      console.error("Failed to mark message as read:", error);
    }
  }, []);

  const addMessage = useCallback((message) => {
    setMessages((prev) => {
      const exists = prev.find((m) => m._id === message._id);
      if (exists) return prev;
      return [...prev, message];
    });
  }, []);

  const updateMessage = useCallback((messageId, updates) => {
    setMessages((prev) => {
      return prev.map((msg) =>
        msg._id === messageId ? { ...msg, ...updates } : msg
      );
    });
  }, []);

  const removeMessage = useCallback((messageId) => {
    setMessages((prev) => prev.filter((msg) => msg._id !== messageId));
  }, []);

  return {
    messages,
    loading,
    sendMessage,
    editMessage,
    deleteMessage,
    likeMessage,
    markAsRead,
    addMessage,
    updateMessage,
    removeMessage,
  };
};
