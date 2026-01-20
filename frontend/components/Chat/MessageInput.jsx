"use client";

import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Send, ImageIcon, Paperclip, X } from "lucide-react";

const MessageInput = ({ onSendMessage, onTyping, replyTo, setReplyTo }) => {
  const [message, setMessage] = useState("");
  const [imagePreview, setImagePreview] = useState(null);
  const [imageFile, setImageFile] = useState(null);

  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);

  useEffect(() => {
    if (replyTo) inputRef.current?.focus();
  }, [replyTo]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!message.trim() && !imageFile && !replyTo) return;

    if (imageFile) {
      onSendMessage("", "image", imageFile, replyTo);
      setImageFile(null);
      setImagePreview(null);
    } else {
      onSendMessage(message, "text", null, replyTo);
    }

    setMessage("");
    setReplyTo(null);
  };

  const handleInputChange = (e) => {
    setMessage(e.target.value);
    onTyping();
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) onSendMessage("", "file", file);
    e.target.value = "";
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result);
      reader.readAsDataURL(file);
    }
    e.target.value = "";
  };

  const cancelImagePreview = () => {
    setImagePreview(null);
    setImageFile(null);
  };

  return (
    <div className="message-input-container">
      {replyTo && (
        <div className="reply-banner">
          <span>
            Replying to <strong>{replyTo.sender.name}</strong>:{" "}
            {replyTo.content}
          </span>
          <button className="close-btn" onClick={() => setReplyTo(null)}>
            <X size={16} />
          </button>
        </div>
      )}

      {imagePreview && (
        <div className="image-preview-banner">
          <img src={imagePreview} alt="Preview" className="image-preview" />
          <button className="close-btn" onClick={cancelImagePreview}>
            <X size={16} />
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="message-input-form">
        <div className="input-actions-left">
          <motion.button
            type="button"
            className="input-action-btn"
            onClick={() => fileInputRef.current?.click()}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            title="Attach file"
          >
            <Paperclip size={18} />
          </motion.button>

          <motion.button
            type="button"
            className="input-action-btn"
            onClick={() => imageInputRef.current?.click()}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            title="Send image"
          >
            <ImageIcon size={18} />
          </motion.button>
        </div>

        <div className="message-input-wrapper">
          <input
            ref={inputRef}
            type="text"
            value={message}
            onChange={handleInputChange}
            placeholder="Message..."
            className="message-input"
          />
        </div>

        <div className="input-actions-right">
          <button className="send-btn" type="submit">
            <p>Send</p>
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.doc,.docx,.txt,.zip,.rar"
          onChange={handleFileUpload}
          style={{ display: "none" }}
        />

        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          style={{ display: "none" }}
        />
      </form>
    </div>
  );
};

export default MessageInput;
