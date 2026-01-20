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

  const updateChatLatestMessage = useCallback((chatId, message) => {
    setChats((prevChats) => {
      const updatedChats = prevChats.map((chat) =>
        chat._id === chatId ? { ...chat, latestMessage: message } : chat,
      );
      storage.setChats(updatedChats);
      return updatedChats;
    });
  }, []);

  return {
    chats,
    loading,
    fetchChats,
    fetchChatById,
    createChat,
    updateChatLatestMessage,
  };
};
