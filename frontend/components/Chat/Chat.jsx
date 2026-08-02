"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useSocket } from "@/hooks/useSocket";
import { useChat } from "@/hooks/useChat";
import Sidebar from "./Sidebar";
import ChatWindow from "./ChatWindow";
import "@/styles/chat.css";

const Chat = React.memo(() => {
  const [selectedChat, setSelectedChat] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(380);
  const [isResizing, setIsResizing] = useState(false);

  const params = useParams();
  const chatId = params?.chatId;
  const router = useRouter();

  const { user } = useAuth();
  const { socket, onlineUsers } = useSocket(user);
  const {
    chats,
    loading,
    createChat,
    updateChatLatestMessage,
    fetchChatById,
    clearChatMessages,
    deleteChat,
  } = useChat();

  const handleResize = useCallback(() => {
    const mobile = typeof window !== "undefined" && window.innerWidth <= 768;
    setIsMobile(mobile);
    if (mobile) {
      setSidebarWidth(380);
    }
  }, []);

  useEffect(() => {
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [handleResize]);

  const handleMouseDown = useCallback(
    (e) => {
      if (isMobile) return;
      setIsResizing(true);
      e.preventDefault();
    },
    [isMobile],
  );

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizing || isMobile) return;
      const newWidth = e.clientX;
      if (newWidth >= 320 && newWidth <= 500) {
        setSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing, isMobile]);

  useEffect(() => {
    if (!chatId) {
      setSelectedChat(null);
      return;
    }

    const existingChat = chats.find((chat) => chat._id === chatId);
    if (existingChat) {
      setSelectedChat(existingChat);
      if (socket) {
        socket.emit("join-chat", chatId);
      }
      return;
    }

    if (!loading) {
      fetchChatById(chatId).then((chat) => {
        setSelectedChat(chat || null);
        if (chat && socket) {
          socket.emit("join-chat", chatId);
        }
      });
    }
  }, [chatId, chats, fetchChatById, loading, socket]);

  useEffect(() => {
    if (!selectedChat) return;
    const updated = chats.find((chat) => chat._id === selectedChat._id);
    if (updated) {
      setSelectedChat(updated);
    }
  }, [chats, selectedChat]);

  // Global socket listener for background incoming messages (updates sidebar chats list in realtime for receivers)
  useEffect(() => {
    if (!socket) return;

    const handleGlobalReceiveMessage = (data) => {
      if (data && data.chatId) {
        updateChatLatestMessage(data.chatId, data);
        socket.emit("join-chat", data.chatId);
      }
    };

    socket.on("receive-message", handleGlobalReceiveMessage);
    return () => {
      socket.off("receive-message", handleGlobalReceiveMessage);
    };
  }, [socket, updateChatLatestMessage]);

  const handleSelectChat = useCallback(
    (chat) => {
      if (!chat) return;
      setSelectedChat(chat);
      router.push(`/chat/${chat._id}`);
      if (socket) {
        socket.emit("join-chat", chat._id);
      }
    },
    [router, socket],
  );

  const showSidebar = !isMobile || !selectedChat;
  const showChatWindow = !isMobile || selectedChat;

  const handleBackToList = useCallback(() => {
    setSelectedChat(null);
    router.push("/chat");
  }, [router]);

  const handleDeleteChat = useCallback(
    async (chatIdToDelete) => {
      try {
        await deleteChat(chatIdToDelete);
        setSelectedChat((current) => (current?._id === chatIdToDelete ? null : current));
        router.push("/chat");
      } catch (error) {
        console.error("Delete chat error:", error);
      }
    },
    [deleteChat, router],
  );

  const handleNewChat = useCallback(
    async (userId) => {
      const newChat = await createChat(userId);
      if (newChat) {
        handleSelectChat(newChat);
      }
    },
    [createChat, handleSelectChat],
  );

  return (
    <div className="chat-container">
      <motion.div
        className="chat-layout"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        {showSidebar && (
          <motion.div
            className={`sidebar-section ${isMobile ? "mobile" : ""}`}
            style={{ width: isMobile ? "100%" : `${sidebarWidth}px` }}
            initial={{ x: -300 }}
            animate={{ x: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Sidebar
              chats={chats}
              loading={loading}
              selectedChat={selectedChat}
              onlineUsers={onlineUsers}
              onChatSelect={handleSelectChat}
              onCreateChat={handleNewChat}
              onDeleteChat={handleDeleteChat}
            />
            {!isMobile && (
              <div className="resize-handle" onMouseDown={handleMouseDown}>
                <div className="resize-line"></div>
              </div>
            )}
          </motion.div>
        )}

        {showChatWindow && (
          <motion.div
            className={`chat-section ${isMobile ? "mobile" : ""}`}
            initial={{ x: 300 }}
            animate={{ x: 0 }}
            transition={{ duration: 0.3 }}
          >
            <ChatWindow
              selectedChat={selectedChat}
              socket={socket}
              isMobile={isMobile}
              onlineUsers={onlineUsers}
              onUpdateChatLatestMessage={updateChatLatestMessage}
              onBackToList={handleBackToList}
              onClearChat={clearChatMessages}
              onDeleteChat={handleDeleteChat}
            />
          </motion.div>
        )}
      </motion.div>
    </div>
  );
});

Chat.displayName = "Chat";

export default Chat;
