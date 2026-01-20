"use client";

import React, {
  memo,
  useMemo,
  useRef,
  useEffect,
  useState,
  useCallback,
} from "react";
import { motion } from "framer-motion";
import MessageItem from "./MessageItem";

const MessageList = memo(
  ({
    messages,
    currentUser,
    onLike,
    onReply,
    onEdit,
    onDelete,
    hasMore,
    loading,
    onLoadMore,
  }) => {
    const messagesEndRef = useRef(null);
    const containerRef = useRef(null);
    const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
    const prevMessagesLengthRef = useRef(messages.length);
    const isLoadingMoreRef = useRef(false);

    useEffect(() => {
      const hasNewMessage = messages.length > prevMessagesLengthRef.current;
      const isNewMessageFromCurrentUser =
        hasNewMessage &&
        messages[messages.length - 1]?.sender._id === currentUser?.id;

      if (
        hasNewMessage &&
        (shouldAutoScroll || isNewMessageFromCurrentUser) &&
        messagesEndRef.current
      ) {
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 100);
      }

      prevMessagesLengthRef.current = messages.length;
    }, [messages.length, shouldAutoScroll, currentUser?.id]);

    const handleScroll = useCallback(
      (e) => {
        const { scrollTop, scrollHeight, clientHeight } = e.target;
        const isAtBottom = scrollHeight - scrollTop <= clientHeight + 50;
        const isAtTop = scrollTop <= 50;

        setShouldAutoScroll(isAtBottom);

        if (isAtTop && hasMore && !loading && !isLoadingMoreRef.current) {
          isLoadingMoreRef.current = true;
          const currentScrollHeight = scrollHeight;

          onLoadMore()
            .then(() => {
              setTimeout(() => {
                if (containerRef.current) {
                  const newScrollHeight = containerRef.current.scrollHeight;
                  const heightDifference =
                    newScrollHeight - currentScrollHeight;
                  containerRef.current.scrollTop = scrollTop + heightDifference;
                }
                isLoadingMoreRef.current = false;
              }, 100);
            })
            .catch(() => {
              isLoadingMoreRef.current = false;
            });
        }
      },
      [hasMore, loading, onLoadMore],
    );

    const scrollToMessage = useCallback((messageId) => {
      const messageElement = document.querySelector(
        `[data-message-id="${messageId}"]`,
      );
      if (messageElement) {
        messageElement.scrollIntoView({ behavior: "smooth", block: "center" });
        messageElement.classList.add("highlighted");
        setTimeout(() => {
          messageElement.classList.remove("highlighted");
        }, 2000);
      }
    }, []);

    const formatDate = (date) => {
      const messageDate = new Date(date);
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      if (messageDate.toDateString() === today.toDateString()) {
        return "Today";
      } else if (messageDate.toDateString() === yesterday.toDateString()) {
        return "Yesterday";
      } else {
        return messageDate.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        });
      }
    };

    const shouldShowDateSeparator = (currentMessage, previousMessage) => {
      if (!previousMessage) return true;
      const currentDate = new Date(currentMessage.createdAt).toDateString();
      const previousDate = new Date(previousMessage.createdAt).toDateString();
      return currentDate !== previousDate;
    };

    const shouldShowAvatar = (currentMessage, nextMessage) => {
      if (!nextMessage) return true;
      if (currentMessage.sender._id === currentUser?.id) return false;
      return currentMessage.sender._id !== nextMessage.sender._id;
    };

    const shouldShowSenderName = (currentMessage, previousMessage) => {
      if (currentMessage.sender._id === currentUser?.id) return false;
      if (!previousMessage) return true;
      return currentMessage.sender._id !== previousMessage.sender._id;
    };

    const messageElements = useMemo(() => {
      return messages.map((message, index) => {
        const showDateSeparator = shouldShowDateSeparator(
          message,
          messages[index - 1],
        );
        const showAvatar = shouldShowAvatar(message, messages[index + 1]);
        const showSenderName = shouldShowSenderName(
          message,
          messages[index - 1],
        );

        return (
          <React.Fragment key={message._id}>
            {showDateSeparator && (
              <div className="date-separator">
                <span>{formatDate(message.createdAt)}</span>
              </div>
            )}

            <MessageItem
              message={message}
              currentUser={currentUser}
              showAvatar={showAvatar}
              showSenderName={showSenderName}
              onLike={onLike}
              onReply={onReply}
              onEdit={onEdit}
              onDelete={onDelete}
              onScrollToMessage={scrollToMessage}
            />
          </React.Fragment>
        );
      });
    }, [
      messages,
      currentUser,
      onLike,
      onReply,
      onEdit,
      onDelete,
      scrollToMessage,
    ]);

    return (
      <div
        className="messages-container"
        ref={containerRef}
        onScroll={handleScroll}
        style={{ overflowY: "auto", height: "100%", position: "relative" }}
      >
        {loading && hasMore && (
          <div
            style={{
              textAlign: "center",
              padding: "16px",
              color: "#8696a0",
              background: "#111111",
              borderBottom: "1px solid #222222",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
              }}
            >
              <div
                className="spinner"
                style={{ width: "16px", height: "16px" }}
              ></div>
              Loading older messages...
            </div>
          </div>
        )}

        <div className="message-list">{messageElements}</div>

        <div ref={messagesEndRef} />
      </div>
    );
  },
);

MessageList.displayName = "MessageList";

export default MessageList;
