"use client";

import { useState, useEffect, useCallback } from "react";
import api from "@/lib/api";
import { storage } from "@/lib/storage";
import toast from "react-hot-toast";

export const useChat = () => {
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchChats = useCallback(async () => {
    try {
      const response = await api.get("/chat");
      setChats(response.data);
      storage.setChats(response.data);
    } catch (error) {
      if (
        error?.name === "CanceledError" ||
        error?.name === "AbortError" ||
        error?.message === "canceled"
      ) {
        return;
      }
      console.error("Failed to fetch chats:", error);
      toast.error("Failed to load chats");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const cachedChats = storage.getChats();
    if (cachedChats.length > 0) {
      setChats(cachedChats);
      setLoading(false);
    }
    fetchChats();
  }, [fetchChats]);

  const fetchChatById = useCallback(async (chatId) => {
    if (!chatId) return null;

    try {
      const response = await api.get(`/chat/${chatId}`);
      const chat = response.data;

      setChats((prevChats) => {
        const exists = prevChats.find((c) => c._id === chat._id);
        if (exists) return prevChats;
        const updatedChats = [chat, ...prevChats];
        storage.setChats(updatedChats);
        return updatedChats;
      });

      return chat;
    } catch (error) {
      toast.error("Unable to open this chat");
      return null;
    }
  }, []);

  const createChat = useCallback(async (userId) => {
    try {
      const response = await api.post("/chat", { userId });
      const newChat = response.data;

      setChats((prevChats) => {
        const exists = prevChats.find((chat) => chat._id === newChat._id);
        if (exists) return prevChats;
        const updatedChats = [newChat, ...prevChats];
        storage.setChats(updatedChats);
        return updatedChats;
      });

      return newChat;
    } catch (error) {
      console.error("Failed to create chat:", error);
      toast.error("Failed to create chat");
      throw error;
    }
  }, []);

  const updateChatLatestMessage = useCallback(
    async (chatId, message) => {
      if (!chatId) return;

      let chatFound = false;

      setChats((prevChats) => {
        const existingIndex = prevChats.findIndex((c) => c._id === chatId);
        if (existingIndex !== -1) {
          chatFound = true;
          const targetChat = {
            ...prevChats[existingIndex],
            latestMessage: message,
            updatedAt: new Date().toISOString(),
          };
          const remaining = prevChats.filter((c) => c._id !== chatId);
          const updated = [targetChat, ...remaining];
          storage.setChats(updated);
          return updated;
        }
        return prevChats;
      });

      // If the chat wasn't found in local state (new chat created by another user), fetch it in background!
      if (!chatFound) {
        try {
          const response = await api.get(`/chat/${chatId}`);
          if (response.data) {
            const newChat = {
              ...response.data,
              latestMessage: message,
              updatedAt: new Date().toISOString(),
            };
            setChats((prev) => {
              if (prev.some((c) => c._id === chatId)) return prev;
              const updated = [newChat, ...prev];
              storage.setChats(updated);
              return updated;
            });
          }
        } catch (e) {
          console.error("Failed to fetch newly received chat:", e);
        }
      }
    },
    [],
  );

  const clearChatMessages = useCallback(async (chatId) => {
    try {
      await api.delete(`/chat/${chatId}/messages`);
      storage.setMessages(chatId, []);
      setChats((prevChats) => {
        const updated = prevChats.map((c) =>
          c._id === chatId ? { ...c, latestMessage: null } : c,
        );
        storage.setChats(updated);
        return updated;
      });
      toast.success("Chat messages cleared");
    } catch (error) {
      console.error("Failed to clear chat messages:", error);
      toast.error("Failed to clear chat messages");
      throw error;
    }
  }, []);

  const deleteChat = useCallback(async (chatId) => {
    try {
      await api.delete(`/chat/${chatId}`);
      storage.setMessages(chatId, []);
      setChats((prevChats) => {
        const updated = prevChats.filter((c) => c._id !== chatId);
        storage.setChats(updated);
        return updated;
      });
      toast.success("Chat deleted");
    } catch (error) {
      console.error("Failed to delete chat:", error);
      toast.error("Failed to delete chat");
      throw error;
    }
  }, []);

  return {
    chats,
    loading,
    fetchChats,
    fetchChatById,
    createChat,
    updateChatLatestMessage,
    clearChatMessages,
    deleteChat,
  };
};
