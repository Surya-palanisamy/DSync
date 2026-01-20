"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Home, MessageCircle, ArrowLeft, Search } from "lucide-react";

export default function NotFound() {
  return (
    <div className="not-found-container">
      {/* Animated Background */}
      <div className="not-found-bg">
        <div className="gradient-orb orb-1"></div>
        <div className="gradient-orb orb-2"></div>
        <div className="floating-shapes">
          {[...Array(6)].map((_, i) => (
            <div key={i} className={`shape shape-${i + 1}`}></div>
          ))}
        </div>
      </div>

      <motion.div
        className="not-found-content"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        {/* Logo */}
        <motion.div
          className="not-found-logo"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
        >
          <MessageCircle size={40} />
        </motion.div>

        {/* 404 Text */}
        <motion.div
          className="error-code"
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          <span className="digit">4</span>
          <motion.span
            className="digit middle"
            animate={{
              rotateY: [0, 360],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "linear",
            }}
          >
            0
          </motion.span>
          <span className="digit">4</span>
        </motion.div>

        {/* Message */}
        <motion.h1
          className="not-found-title"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          Page Not Found
        </motion.h1>

        <motion.p
          className="not-found-description"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          Oops! The page you're looking for seems to have wandered off. Don't
          worry, let's get you back on track.
        </motion.p>

        {/* Actions */}
        <motion.div
          className="not-found-actions"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Link href="/" className="action-btn primary">
            <Home size={18} />
            <span>Go Home</span>
          </Link>
          <Link href="/chat" className="action-btn secondary">
            <ArrowLeft size={18} />
            <span>Back to Chat</span>
          </Link>
        </motion.div>

        {/* Help text */}
        <motion.div
          className="not-found-help"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
        >
          <Search size={14} />
          <span>
            Looking for something specific? Try checking the URL or contact
            support.
          </span>
        </motion.div>
      </motion.div>
    </div>
  );
}
