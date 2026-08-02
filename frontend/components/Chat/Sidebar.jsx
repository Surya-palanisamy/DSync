"use client";

import React, { useState, memo } from "react";
import { AnimatePresence } from "framer-motion";
import { Search, Plus, Settings, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import ChatList from "./ChatList";
import UserSearch from "./UserSearch";
import ProfileModal from "./ProfileModal";
import toast from "react-hot-toast";

const Sidebar = memo(
  ({
    chats,
    loading,
    selectedChat,
    onChatSelect,
    onlineUsers,
    onCreateChat,
    onDeleteChat,
  }) => {
    const [searchTerm, setSearchTerm] = useState("");
    const [showUserSearch, setShowUserSearch] = useState(false);
    const [showProfileModal, setShowProfileModal] = useState(false);

    const { user, logout } = useAuth();
    const router = useRouter();

    const handleLogout = async () => {
      await logout();
      router.push("/");
    };

    const handleNewChat = async (userId) => {
      try {
        const newChat = await onCreateChat(userId);
        onChatSelect?.(newChat);
        setShowUserSearch(false);
        toast.success("Chat created successfully");
      } catch (error) {
        toast.error("Failed to create chat");
      }
    };

    const filteredChats = chats.filter((chat) =>
      chat.isGroupChat
        ? chat.chatName.toLowerCase().includes(searchTerm.toLowerCase())
        : chat.users
            .find((u) => u._id !== user?.id)
            ?.name.toLowerCase()
            .includes(searchTerm.toLowerCase()),
    );

    return (
      <>
        <div className="sidebar">
          <div className="sidebar-header">
            {/* Row 1: User Profile + DSync Title */}
            <div className="sidebar-top-row">
              <div
                className="sidebar-user"
                onClick={() => setShowProfileModal(true)}
              >
                <div className="sidebar-avatar-wrap">
                  <img
                    src={
                      user?.avatar ||
                      `https://ui-avatars.com/api/?name=${user?.name}&background=8b5cf6&color=fff&size=128`
                    }
                    alt={user?.name}
                    className="sidebar-avatar"
                  />
                  <div className="sidebar-online-dot"></div>
                </div>
                <div className="sidebar-user-info">
                  <span className="sidebar-user-name">{user?.name}</span>
                </div>
              </div>

              <div className="sidebar-title" onClick={() => router.push("/")}>
                DSync
              </div>  
            </div>

            {/* Row 2: Action Buttons */}
            <div className="sidebar-actions">
              <button
                className="sidebar-action-btn"
                onClick={() => setShowUserSearch(true)}
                title="New chat"
              >
                <Plus size={18} />
              </button>
              <button
                className="sidebar-action-btn"
                onClick={() => setShowProfileModal(true)}
                title="Settings"
              >
                <Settings size={18} />
              </button>
              <button
                className="sidebar-action-btn sidebar-logout-btn"
                onClick={handleLogout}
                title="Logout"
              >
                <LogOut size={18} />
              </button>
            </div>

            {/* Row 3: Search */}
            <div className="sidebar-search">
              <Search size={16} className="sidebar-search-icon" />
              <input
                type="text"
                placeholder="Search conversations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="sidebar-search-input"
              />
            </div>
          </div>

          {/* Chat List */}
          <div className="chat-list-container">
            <ChatList
              chats={filteredChats}
              loading={loading}
              selectedChat={selectedChat}
              onChatSelect={onChatSelect}
              currentUser={user}
              onlineUsers={onlineUsers}
              onDeleteChat={onDeleteChat}
            />
          </div>
        </div>

        <AnimatePresence>
          {showUserSearch && (
            <UserSearch
              onClose={() => setShowUserSearch(false)}
              onUserSelect={handleNewChat}
              currentUser={user}
            />
          )}
          {showProfileModal && (
            <ProfileModal onClose={() => setShowProfileModal(false)} />
          )}
        </AnimatePresence>
      </>
    );
  },
);

Sidebar.displayName = "Sidebar";

export default Sidebar;
