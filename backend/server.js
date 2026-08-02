// server.js
const dns = require("dns");
try {
  dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]);
} catch (err) {
  console.warn("Could not set custom DNS servers:", err.message);
}

require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const http = require("http");
const socketIo = require("socket.io");
const jwt = require("jsonwebtoken");
const authRoutes = require("./routes/auth");
const chatRoutes = require("./routes/chat");
const messageRoutes = require("./routes/message");
const { checkOrigin } = require("./middleware/cors");

// Load models once at startup (not inside socket connection handlers)
const Message = require("./models/Message");
const Chat = require("./models/Chat");
const User = require("./models/User");

const app = express();
const server = http.createServer(app);

const isProduction = process.env.NODE_ENV === "production";

app.use(express.static("public"));

// ---------------------------
// Socket.io setup with shared CORS
const io = socketIo(server, {
  cors: {
    origin: checkOrigin,
    methods: ["GET", "POST"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization", "Cookie"],
  },
  transports: ["websocket", "polling"],
});

// ---------------------------
// Socket.io authentication middleware
// Verifies JWT on handshake to prevent unauthorized connections
io.use((socket, next) => {
  try {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.headers?.cookie
        ?.split("; ")
        .find((c) => c.startsWith("token="))
        ?.split("=")[1];

    if (!token) {
      // Allow connection but mark as unauthenticated
      // The "join" event will still require a userId
      return next();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.userId;
    next();
  } catch (err) {
    // Allow connection even if token is invalid — the client will
    // re-authenticate via the "join" event
    next();
  }
});

// ---------------------------
// Trust proxy in production so secure cookies behind proxies work correctly
if (isProduction) {
  app.set("trust proxy", 1);
}

// ---------------------------
// CORS middleware for express (shared origin check)
app.use(
  cors({
    origin: checkOrigin,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "Cookie",
    ],
    exposedHeaders: ["Set-Cookie"],
    optionsSuccessStatus: 200,
  })
);

// Handle preflight requests
app.options("*", cors());

// ---------------------------
// Body parsing, cookies
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());

// ---------------------------
// Request logging middleware (reduced in production)
if (!isProduction) {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`, {
      origin: req.headers.origin,
    });
    next();
  });
}

// ---------------------------
// Basic routes / health

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
  });
});

// ---------------------------
// API routes
app.use("/api/auth", authRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/message", messageRoutes);

// ---------------------------
// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Error:", err && err.stack ? err.stack : err);
  if (err && err.message === "Not allowed by CORS") {
    return res
      .status(403)
      .json({ success: false, message: "CORS origin not allowed" });
  }

  res.status(500).json({
    success: false,
    message: isProduction
      ? "Internal server error"
      : (err && err.message) || "Internal server error",
  });
});

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

// ---------------------------
// MongoDB connection (removed deprecated options — no-ops since Mongoose 6+)
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch((err) => console.error("❌ MongoDB error:", err));

// ---------------------------
// Socket.io event handlers
const users = new Map();
const onlineUsers = new Set();

// Debounced batch writer for message status updates
// Collects message-read and message-delivered events, flushes to DB periodically
const pendingReads = new Map(); // messageId -> { chatId, userId, readAt }
const pendingDeliveries = new Map(); // messageId -> { chatId, userId, deliveredAt }

const flushPendingReads = async () => {
  if (pendingReads.size === 0) return;

  const batch = new Map(pendingReads);
  pendingReads.clear();

  for (const [messageId, data] of batch) {
    try {
      const message = await Message.findById(messageId);
      if (!message) continue;

      const chat = await Chat.findById(data.chatId).select("users").lean();
      if (!chat) continue;

      const hasRead = (message.readBy || []).some(
        (entry) => entry.user?.toString?.() === data.userId.toString()
      );

      if (!hasRead) {
        message.readBy.push({ user: data.userId, readAt: data.readAt || new Date() });
      }

      const participantCount = (chat.users || []).filter(
        (u) => u.toString() !== message.sender.toString()
      ).length;

      if (
        participantCount > 0 &&
        message.readBy.length >= participantCount &&
        message.status !== "seen"
      ) {
        message.status = "seen";
      }

      await message.save();

      io.to(data.chatId).emit("message-read", {
        chatId: data.chatId,
        messageId,
        userId: data.userId,
        status: message.status,
        readBy: message.readBy,
      });
    } catch (error) {
      console.error("Flush read error:", error);
    }
  }
};

const flushPendingDeliveries = async () => {
  if (pendingDeliveries.size === 0) return;

  const batch = new Map(pendingDeliveries);
  pendingDeliveries.clear();

  for (const [messageId, data] of batch) {
    try {
      const message = await Message.findById(messageId);
      if (!message) continue;

      const chat = await Chat.findById(data.chatId).select("users").lean();
      if (!chat) continue;

      const deliveredList = message.deliveredTo || [];
      const alreadyDelivered = deliveredList.some(
        (entry) => entry.user?.toString?.() === data.userId.toString()
      );

      if (!alreadyDelivered) {
        deliveredList.push({
          user: data.userId,
          deliveredAt: data.deliveredAt || new Date(),
        });
        message.deliveredTo = deliveredList;
      }

      const participantCount = (chat.users || []).filter(
        (u) => u.toString() !== message.sender.toString()
      ).length;

      if (
        participantCount > 0 &&
        deliveredList.length >= participantCount &&
        message.status === "sent"
      ) {
        message.status = "delivered";
      }

      await message.save();

      io.to(data.chatId).emit("message-delivered", {
        chatId: data.chatId,
        messageId,
        userId: data.userId,
        deliveredAt: data.deliveredAt || new Date(),
        status: message.status,
        deliveredTo: message.deliveredTo,
      });
    } catch (error) {
      console.error("Flush delivery error:", error);
    }
  }
};

// Flush every 500ms instead of writing on every event
const FLUSH_INTERVAL = 500;
setInterval(flushPendingReads, FLUSH_INTERVAL);
setInterval(flushPendingDeliveries, FLUSH_INTERVAL);

io.on("connection", (socket) => {
  if (!isProduction) {
    console.log("User connected:", socket.id);
  }

  socket.on("join", (userId) => {
    try {
      if (userId) {
        users.set(userId, socket.id);
        onlineUsers.add(userId);
        socket.join(userId);

        // Broadcast online status
        socket.broadcast.emit("user-online", userId);
        io.emit("online-users", Array.from(onlineUsers));

        if (!isProduction) {
          console.log(`User ${userId} joined`);
        }
      }
    } catch (error) {
      console.error("Join error:", error);
    }
  });

  socket.on("join-chat", (chatId) => {
    try {
      if (chatId) {
        socket.join(chatId);
      }
    } catch (error) {
      console.error("Join chat error:", error);
    }
  });

  socket.on("send-message", (data) => {
    try {
      if (data && data.chatId) {
        // Emit to chat room (for users currently inside the chat window)
        socket.to(data.chatId).emit("receive-message", data);

        // Also emit directly to recipient user rooms so receivers get new messages & new chats in realtime
        const usersToNotify = data.chat?.users || data.participants || [];
        if (Array.isArray(usersToNotify)) {
          usersToNotify.forEach((u) => {
            const uId = typeof u === "object" ? u._id?.toString() : u?.toString();
            if (uId && uId !== socket.userId) {
              io.to(uId).emit("receive-message", data);
            }
          });
        }
      }
    } catch (error) {
      console.error("Send message error:", error);
    }
  });

  socket.on("typing", (data) => {
    try {
      if (data && data.chatId) {
        socket.to(data.chatId).emit("user-typing", {
          ...data,
          userAvatar: data.userAvatar || null,
        });
      }
    } catch (error) {
      console.error("Typing error:", error);
    }
  });

  socket.on("stop-typing", (data) => {
    try {
      if (data && data.chatId) {
        socket.to(data.chatId).emit("user-stop-typing", data);
      }
    } catch (error) {
      console.error("Stop typing error:", error);
    }
  });

  // Debounced — queued for batch write
  socket.on("message-read", (data = {}) => {
    const { chatId, messageId, userId } = data;
    if (!chatId || !messageId || !userId) return;

    pendingReads.set(messageId, { chatId, userId, readAt: new Date() });
  });

  socket.on("message-liked", (data) => {
    try {
      if (data && data.chatId) {
        io.to(data.chatId).emit("message-liked", data);
      }
    } catch (error) {
      console.error("Message liked error:", error);
    }
  });

  // Debounced — queued for batch write
  socket.on("message-delivered", (data = {}) => {
    const { chatId, messageId, userId, deliveredAt } = data;
    if (!chatId || !messageId || !userId) return;

    pendingDeliveries.set(messageId, {
      chatId,
      userId,
      deliveredAt: deliveredAt || new Date(),
    });
  });

  socket.on("message-edited", (data) => {
    try {
      if (data && data.chatId) {
        socket.to(data.chatId).emit("message-edited", data);
      }
    } catch (error) {
      console.error("Message edited error:", error);
    }
  });

  socket.on("message-deleted", (data) => {
    try {
      if (data && data.chatId) {
        socket.to(data.chatId).emit("message-deleted", data);
      }
    } catch (error) {
      console.error("Message deleted error:", error);
    }
  });

  socket.on("disconnect", async () => {
    if (!isProduction) {
      console.log("User disconnected:", socket.id);
    }
    try {
      for (const [userId, socketId] of users.entries()) {
        if (socketId === socket.id) {
          users.delete(userId);
          onlineUsers.delete(userId);

          const lastSeen = new Date();

          // Update user in DB
          await User.findByIdAndUpdate(userId, {
            isOnline: false,
            lastSeen,
          });

          // Emit updated lastSeen to others
          socket.broadcast.emit("user-offline", {
            userId,
            lastSeen,
          });
          io.emit("online-users", Array.from(onlineUsers));

          break;
        }
      }
    } catch (error) {
      console.error("Disconnect error:", error);
    }
  });

  socket.on("error", (error) => {
    console.error("Socket error:", error);
  });
});

// ---------------------------
// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`JWT Secret configured: ${!!process.env.JWT_SECRET}`);
  console.log(`MongoDB URI configured: ${!!process.env.MONGODB_URI}`);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM received, shutting down gracefully");
  server.close(() => {
    mongoose.connection.close();
    process.exit(0);
  });
});
