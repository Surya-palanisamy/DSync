"use client";

import React, { memo } from "react";
import { motion, AnimatePresence } from "framer-motion";

const TypingIndicator = memo(({ typingUsers }) => {
  if (!typingUsers || typingUsers.length === 0) return null;

  const getTypingUser = () => {
    const user = typingUsers[0];
    if (typeof user === "string") {
      return { userId: user, name: "Someone", avatar: null };
    }
    return user;
  };

  const typingUser = getTypingUser();

  return (
    <AnimatePresence>
      <motion.div
        className="typing-indicator"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.2 }}
      >
        <div className="typing-avatar">
          <img
            src={
              typingUser.avatar ||
              `https://ui-avatars.com/api/?name=${encodeURIComponent(typingUser.name || "User")}&background=8b5cf6&color=fff&size=56`
            }
            alt={`${typingUser.name} is typing`}
          />
        </div>
        <div className="typing-bubble">
          <div className="typing-dots">
            <span></span>
            <span></span>
            <span></span>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
});

TypingIndicator.displayName = "TypingIndicator";

export default TypingIndicator;
