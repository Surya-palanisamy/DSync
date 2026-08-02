"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, MoreVertical, Phone, Video, RotateCcw, Trash2 } from "lucide-react";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useAuth } from "@/context/AuthContext";
import { useMessages } from "@/hooks/useMessages";
import MessageInput from "./MessageInput";
import MessageList from "./MessageList";
import TypingIndicator from "./TypingIndicator";

const ChatWindow = React.memo(
  ({
    selectedChat,
    socket,
    isMobile,
    onlineUsers,
    onUpdateChatLatestMessage,
    onBackToList,
    onClearChat,
    onDeleteChat,
  }) => {
    const [typing, setTyping] = useState(false);
    const [typingUsers, setTypingUsers] = useState([]);
    const [replyTo, setReplyTo] = useState(null);
    const [showHeaderMenu, setShowHeaderMenu] = useState(false);

    const { user } = useAuth();
    const typingTimeoutRef = useRef(null);
    const headerMenuRef = useRef(null);

    // Click outside handler for header menu
    useEffect(() => {
      const handleClickOutside = (event) => {
        if (
          headerMenuRef.current &&
          !headerMenuRef.current.contains(event.target)
        ) {
          setShowHeaderMenu(false);
        }
      };

      if (showHeaderMenu) {
        document.addEventListener("mousedown", handleClickOutside);
        document.addEventListener("touchstart", handleClickOutside);
      }

      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
        document.removeEventListener("touchstart", handleClickOutside);
      };
    }, [showHeaderMenu]);

    // Use a ref for messages inside socket event handlers to avoid
    // re-subscribing on every message change
    const messagesRef = useRef([]);

    const {
      messages,
      loading,
      hasMore,
      sendMessage,
      editMessage,
      deleteMessage,
      likeMessage,
      markAsRead,
      addMessage,
      updateMessage,
      removeMessage,
      loadMoreMessages,
      clearAllMessages,
    } = useMessages(selectedChat?._id, user);

    const handleClearChat = async () => {
      if (!selectedChat?._id || !onClearChat) return;
      setShowHeaderMenu(false);
      if (
        window.confirm("Are you sure you want to clear all messages in this chat?")
      ) {
        try {
          await onClearChat(selectedChat._id);
          clearAllMessages();
        } catch (e) {
          console.error("Clear chat error:", e);
        }
      }
    };

    const handleDeleteChat = async () => {
      if (!selectedChat?._id || !onDeleteChat) return;
      setShowHeaderMenu(false);
      if (
        window.confirm("Are you sure you want to delete this chat permanently?")
      ) {
        try {
          await onDeleteChat(selectedChat._id);
          clearAllMessages();
          if (onBackToList) onBackToList();
        } catch (e) {
          console.error("Delete chat error:", e);
        }
      }
    };

    // Keep messagesRef in sync
    useEffect(() => {
      messagesRef.current = messages;
    }, [messages]);

    // Socket event handlers — NO `messages` in dependency array
    useEffect(() => {
      if (socket && selectedChat) {
        socket.emit("join-chat", selectedChat._id);

        const handleReceiveMessage = (message) => {
          if (
            message.chat._id === selectedChat._id ||
            message.chat === selectedChat._id
          ) {
            addMessage(message);
            onUpdateChatLatestMessage(selectedChat._id, message);

            if (message.sender._id !== user?.id) {
              socket.emit("message-delivered", {
                chatId: selectedChat._id,
                messageId: message._id,
                userId: user?.id,
                deliveredAt: new Date().toISOString(),
              });

              setTimeout(async () => {
                try {
                  await markAsRead(message._id);
                  socket.emit("message-read", {
                    chatId: selectedChat._id,
                    messageId: message._id,
                    userId: user?.id,
                  });
                } catch (err) {
                  console.error("Mark as read error:", err);
                }
              }, 300);
            }
          }
        };

        const handleUserTyping = (data) => {
          if (data.chatId === selectedChat._id && data.userId !== user?.id) {
            setTypingUsers((prev) => {
              const userExists = prev.find((u) => u.userId === data.userId);
              if (userExists) return prev;
              return [
                ...prev,
                {
                  userId: data.userId,
                  name: data.userName,
                  avatar: data.userAvatar,
                },
              ];
            });
          }
        };

        const handleUserStopTyping = (data) => {
          if (data.chatId === selectedChat._id) {
            setTypingUsers((prev) =>
              prev.filter((u) => u.userId !== data.userId),
            );
          }
        };

        const handleMessageRead = (data) => {
          if (data.chatId === selectedChat._id) {
            // Use messagesRef instead of messages to avoid stale closures
            const currentMessages = messagesRef.current;
            const existingReadBy =
              currentMessages.find((m) => m._id === data.messageId)?.readBy ||
              [];
            const alreadyRead = existingReadBy.some(
              (r) => r.user?._id === data.userId || r.user === data.userId,
            );
            const newReadBy = alreadyRead
              ? existingReadBy
              : [
                  ...existingReadBy,
                  { user: { _id: data.userId }, readAt: new Date() },
                ];
            updateMessage(data.messageId, {
              readBy: newReadBy,
              status: "seen",
            });
          }
        };

        const handleMessageDelivered = (data) => {
          if (data.chatId === selectedChat._id) {
            const currentMessages = messagesRef.current;
            const msg = currentMessages.find(
              (m) => m._id === data.messageId,
            );
            const existing = msg?.deliveredTo || [];
            const already = existing.some(
              (d) =>
                d.user?.toString?.() === data.userId?.toString?.() ||
                d.user === data.userId,
            );
            const deliveredTo = already
              ? existing
              : [
                  ...existing,
                  {
                    user: data.userId,
                    deliveredAt: data.deliveredAt || new Date(),
                  },
                ];
            const currentStatus = msg?.status;
            const newStatus = currentStatus === "seen" ? "seen" : "delivered";
            updateMessage(data.messageId, { deliveredTo, status: newStatus });
          }
        };

        const handleMessageLiked = (data) => {
          if (data.chatId === selectedChat._id) {
            updateMessage(data.messageId, { likes: data.likes });
          }
        };

        const handleMessageEdited = (data) => {
          if (data.chatId === selectedChat._id) {
            updateMessage(data.messageId, {
              content: data.content,
              isEdited: true,
            });
          }
        };

        const handleMessageDeleted = (data) => {
          if (data.chatId === selectedChat._id) {
            removeMessage(data.messageId);
          }
        };

        socket.on("receive-message", handleReceiveMessage);
        socket.on("user-typing", handleUserTyping);
        socket.on("user-stop-typing", handleUserStopTyping);
        socket.on("message-read", handleMessageRead);
        socket.on("message-liked", handleMessageLiked);
        socket.on("message-edited", handleMessageEdited);
        socket.on("message-deleted", handleMessageDeleted);
        socket.on("message-delivered", handleMessageDelivered);

        return () => {
          socket.off("receive-message", handleReceiveMessage);
          socket.off("user-typing", handleUserTyping);
          socket.off("user-stop-typing", handleUserStopTyping);
          socket.off("message-read", handleMessageRead);
          socket.off("message-liked", handleMessageLiked);
          socket.off("message-edited", handleMessageEdited);
          socket.off("message-deleted", handleMessageDeleted);
          socket.off("message-delivered", handleMessageDelivered);
        };
      }
    }, [
      socket,
      selectedChat,
      user?.id,
      addMessage,
      updateMessage,
      removeMessage,
      markAsRead,
      onUpdateChatLatestMessage,
      // `messages` deliberately excluded — using messagesRef instead
    ]);

    const handleSendMessage = useCallback(
      async (content, messageType = "text", file = null, replyToMsg = null) => {
        try {
          const newMessage = await sendMessage(
            content,
            messageType,
            file,
            replyToMsg,
          );

          if (socket && newMessage) {
            socket.emit("send-message", {
              ...newMessage,
              chatId: selectedChat._id,
            });
            onUpdateChatLatestMessage(selectedChat._id, newMessage);
          }
        } catch (error) {
          console.error("Send message error:", error);
        }
      },
      [sendMessage, socket, selectedChat, onUpdateChatLatestMessage],
    );

    const handleEditMessage = useCallback(
      async (messageId, newContent) => {
        try {
          await editMessage(messageId, newContent);
          if (socket) {
            socket.emit("message-edited", {
              messageId,
              content: newContent,
              chatId: selectedChat._id,
            });
          }
        } catch (error) {
          console.error("Edit message error:", error);
        }
      },
      [editMessage, socket, selectedChat],
    );

    const handleDeleteMessage = useCallback(
      async (messageId) => {
        if (
          typeof window !== "undefined" &&
          window.confirm("Are you sure you want to delete this message?")
        ) {
          try {
            await deleteMessage(messageId);
            if (socket) {
              socket.emit("message-deleted", {
                messageId,
                chatId: selectedChat._id,
              });
            }
          } catch (error) {
            console.error("Delete message error:", error);
          }
        }
      },
      [deleteMessage, socket, selectedChat],
    );

    const handleLikeMessage = useCallback(
      async (messageId) => {
        try {
          const likes = await likeMessage(messageId);
          if (socket) {
            socket.emit("message-liked", {
              messageId,
              likes,
              chatId: selectedChat._id,
              userId: user?.id,
            });
          }
        } catch (error) {
          console.error("Like message error:", error);
        }
      },
      [likeMessage, socket, selectedChat, user?.id],
    );

    const handleTyping = useCallback(() => {
      if (!socket || !selectedChat) return;

      if (!typing) {
        setTyping(true);
        socket.emit("typing", {
          chatId: selectedChat._id,
          userId: user?.id,
          userName: user?.name,
          userAvatar: user?.avatar,
        });
      }

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      typingTimeoutRef.current = setTimeout(() => {
        setTyping(false);
        socket.emit("stop-typing", {
          chatId: selectedChat._id,
          userId: user?.id,
        });
      }, 1000);
    }, [socket, selectedChat, typing, user]);

    const chatInfo = useMemo(() => {
      if (!selectedChat) return { name: "", avatar: "", status: "" };

      if (selectedChat.isGroupChat) {
        return {
          name: selectedChat.chatName,
          avatar:
            selectedChat.groupImage ||
            `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedChat.chatName)}&background=8b5cf6&color=fff`,
          status: `${selectedChat.users.length} members`,
        };
      }

      const otherUser = selectedChat.users.find((u) => u._id !== user?.id);
      const isOnline = onlineUsers.includes(otherUser?._id);

      let status = "";
      if (typingUsers.length > 0) {
        status = "typing...";
      } else if (isOnline) {
        status = "Active now";
      } else if (otherUser?.lastSeen) {
        const date = new Date(otherUser.lastSeen);
        status = `Last seen ${date.toLocaleString("en-US", {
          hour: "numeric",
          minute: "numeric",
          hour12: true,
          day: "numeric",
          month: "short",
        })}`;
      } else {
        status = "Last seen unknown";
      }

      return {
        name: otherUser?.name || "Unknown User",
        avatar:
          otherUser?.avatar ||
          `https://ui-avatars.com/api/?name=${encodeURIComponent(otherUser?.name || "User")}&background=8b5cf6&color=fff`,
        status,
        isOnline,
      };
    }, [selectedChat, user?.id, onlineUsers, typingUsers]);

    if (!selectedChat) {
      return (
        <>
          <div className="chat-window-empty">
            <div className="chat-bg">
              <div className="gradient-orb orb-1"></div>
              <div className="gradient-orb orb-2"></div>
              <div className="gradient-orb orb-3"></div>
              <div className="grid-pattern"></div>
            </div>
            <div className="empty-state">
              <div className="empty-icon">💬</div>
              <h3>DSync – perfect for connecting and sharing.</h3>
              <p>Choose from your existing conversations or start a new one</p>
            </div>
          </div>
        </>
      );
    }

    return (
      <div className="chat-window">
        <div className="chat-header">
          {isMobile && (
            <motion.button
              className="back-btn"
              onClick={onBackToList}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <ArrowLeft size={20} />
            </motion.button>
          )}

          <div className="chat-info">
            <div className="chat-avatar-container">
              <img
                src={chatInfo.avatar || "/placeholder.svg"}
                alt={chatInfo.name}
                className="chat-avatar"
              />
              {!selectedChat.isGroupChat && chatInfo.isOnline && (
                <div className="online-indicator"></div>
              )}
            </div>
            <div className="chat-details">
              <h3 className="chat-name">{chatInfo.name}</h3>
              <span className="chat-status">{chatInfo.status}</span>
            </div>
          </div>

          <div className="chat-actions">
            <motion.button
              className="action-btn"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              title="Call"
            >
              <Phone size={18} />
            </motion.button>
            <motion.button
              className="action-btn"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              title="Video call"
            >
              <Video size={18} />
            </motion.button>
            <div style={{ position: "relative" }} ref={headerMenuRef}>
              <motion.button
                className="action-btn"
                onClick={() => setShowHeaderMenu(!showHeaderMenu)}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                title="Chat options"
              >
                <MoreVertical size={18} />
              </motion.button>

              <AnimatePresence>
                {showHeaderMenu && (
                  <motion.div
                    className="chat-header-dropdown"
                    initial={{ opacity: 0, scale: 0.9, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: -10 }}
                    transition={{ duration: 0.15 }}
                    style={{
                      position: "absolute",
                      right: 0,
                      top: "100%",
                      marginTop: "8px",
                      background: "#18181b",
                      border: "1px solid #27272a",
                      borderRadius: "12px",
                      padding: "6px",
                      boxShadow: "0 8px 24px rgba(0, 0, 0, 0.4)",
                      zIndex: 100,
                      minWidth: "160px",
                    }}
                  >
                    <button
                      className="menu-item"
                      onClick={handleClearChat}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        width: "100%",
                        padding: "8px 12px",
                        background: "none",
                        border: "none",
                        color: "#e4e4e7",
                        fontSize: "14px",
                        cursor: "pointer",
                        borderRadius: "8px",
                      }}
                    >
                      <RotateCcw size={16} />
                      <span>Clear Chat</span>
                    </button>
                    <button
                      className="menu-item delete"
                      onClick={handleDeleteChat}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        width: "100%",
                        padding: "8px 12px",
                        background: "none",
                        border: "none",
                        color: "#ef4444",
                        fontSize: "14px",
                        cursor: "pointer",
                        borderRadius: "8px",
                      }}
                    >
                      <Trash2 size={16} />
                      <span>Delete Chat</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        <div className="messages-container">
          {loading && messages.length === 0 ? (
            <div className="loading-messages">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className={`message-skeleton ${i % 2 === 0 ? "sent" : "received"}`}
                >
                  <div className="skeleton-bubble"></div>
                </div>
              ))}
            </div>
          ) : (
            <MessageList
              messages={messages}
              currentUser={user}
              onLike={handleLikeMessage}
              onReply={(msg) => setReplyTo(msg)}
              onEdit={handleEditMessage}
              onDelete={handleDeleteMessage}
              hasMore={hasMore}
              loading={loading}
              onLoadMore={loadMoreMessages}
              onScrollToMessage={(messageId) => {
                const messageElement = document.querySelector(
                  `[data-message-id="${messageId}"]`,
                );
                if (messageElement) {
                  messageElement.scrollIntoView({
                    behavior: "smooth",
                    block: "center",
                  });
                  messageElement.classList.add("highlighted");
                  setTimeout(() => {
                    messageElement.classList.remove("highlighted");
                  }, 2000);
                }
              }}
            />
          )}
        </div>

        {typingUsers.length > 0 && (
          <div className="typing-indicator-container">
            <TypingIndicator typingUsers={typingUsers} currentUser={user} />
          </div>
        )}

        <MessageInput
          onSendMessage={handleSendMessage}
          onTyping={handleTyping}
          replyTo={replyTo}
          setReplyTo={setReplyTo}
          currentUser={user}
        />
      </div>
    );
  },
);

ChatWindow.displayName = "ChatWindow";

export default ChatWindow;
