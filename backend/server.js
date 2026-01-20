// server.js
require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const http = require("http");
const socketIo = require("socket.io");
const authRoutes = require("./routes/auth");
const chatRoutes = require("./routes/chat");
const messageRoutes = require("./routes/message");

const app = express();
const server = http.createServer(app);

// ---------------------------
// Allowed origins (explicit)
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:3000",
  "https://dsync-chat.vercel.app",
  "https://dsync.suryapalanisamy.tech",

  process.env.FRONTEND_URL, // optional, if provided
].filter(Boolean);

app.use(express.static("public"));
// ---------------------------
// Socket.io setup
const io = socketIo(server, {
  cors: {
    origin: (origin, callback) => {
      // Note: socket.io passes undefined origin for non-browser clients
      if (!origin) return callback(null, true);

      // Exact match list
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      // Allow vercel preview subdomains: *.vercel.app
      try {
        const url = new URL(origin);
        if (url.hostname && url.hostname.endsWith(".vercel.app")) {
          return callback(null, true);
        }
      } catch (e) {
        // ignore parse errors
      }

      // Allow localhost in development (any port)
      if (
        process.env.NODE_ENV !== "production" &&
        origin.includes("localhost")
      ) {
        return callback(null, true);
      }

      console.log("Socket origin not allowed:", origin);
      return callback(new Error("Not allowed by CORS"));
    },
    methods: ["GET", "POST"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization", "Cookie"],
  },
  transports: ["websocket", "polling"],
});

// ---------------------------
// Trust proxy in production so secure cookies behind proxies work correctly
if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

// ---------------------------
// CORS middleware for express
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (curl, mobile apps, server-to-server)
      if (!origin) {
        console.log("No origin, allowing request");
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        console.log("Origin allowed:", origin);
        return callback(null, true);
      }

      // Allow vercel preview subdomains: *.vercel.app
      try {
        const url = new URL(origin);
        if (url.hostname && url.hostname.endsWith(".vercel.app")) {
          console.log("Vercel preview origin allowed:", origin);
          return callback(null, true);
        }
      } catch (e) {
        // ignore parse errors
      }

      // Allow localhost in dev
      if (
        process.env.NODE_ENV !== "production" &&
        origin.includes("localhost")
      ) {
        console.log("Development localhost allowed:", origin);
        return callback(null, true);
      }

      console.log("Origin not allowed:", origin);
      callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "Cookie",
      "Access-Control-Allow-Credentials",
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
// Request logging middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`, {
    cookies: req.cookies,
    headers: {
      authorization: req.headers.authorization,
      origin: req.headers.origin,
    },
  });
  next();
});

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
// API routes (note: your frontend expects /api/...)
// keep these paths consistent with frontend api baseURL
app.use("/api/auth", authRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/message", messageRoutes);

// ---------------------------
// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Error:", err && err.stack ? err.stack : err);
  // If it's a CORS error thrown from origin callback, it may be an Error object
  if (err && err.message === "Not allowed by CORS") {
    return res
      .status(403)
      .json({ success: false, message: "CORS origin not allowed" });
  }

  res.status(500).json({
    success: false,
    message:
      process.env.NODE_ENV === "production"
        ? "Internal server error"
        : (err && err.message) || "Internal server error",
  });
});

// 404 handler
app.use("*", (req, res) => {
  console.log("404 - Route not found:", req.originalUrl);
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

// ---------------------------
// MongoDB connection
mongoose
  .connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch((err) => console.error("❌ MongoDB error:", err));

// ---------------------------
// Socket.io event handlers
const users = new Map();
const onlineUsers = new Set();

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // Lazy-load models inside the connection scope to avoid hoisting issues
  const Message = require("./models/Message");
  const Chat = require("./models/Chat");
  const User = require("./models/User");

  socket.on("join", (userId) => {
    try {
      if (userId) {
        users.set(userId, socket.id);
        onlineUsers.add(userId);
        socket.join(userId);

        // Broadcast online status
        socket.broadcast.emit("user-online", userId);
        io.emit("online-users", Array.from(onlineUsers));

        console.log(`User ${userId} joined`);
      }
    } catch (error) {
      console.error("Join error:", error);
    }
  });

  socket.on("join-chat", (chatId) => {
    try {
      if (chatId) {
        socket.join(chatId);
        console.log(`Socket ${socket.id} joined chat ${chatId}`);
      }
    } catch (error) {
      console.error("Join chat error:", error);
    }
  });

  socket.on("send-message", (data) => {
    try {
      if (data && data.chatId) {
        // emit to everyone in the chat room except the sender
        socket.to(data.chatId).emit("receive-message", data);
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

  socket.on("message-read", async (data = {}) => {
    const { chatId, messageId, userId } = data;

    try {
      if (!chatId || !messageId || !userId) return;

      const message = await Message.findById(messageId);
      if (!message) return;

      const chat = await Chat.findById(chatId).select("users");
      if (!chat) return;

      const hasRead = (message.readBy || []).some(
        (entry) => entry.user?.toString?.() === userId.toString()
      );

      if (!hasRead) {
        message.readBy.push({ user: userId, readAt: new Date() });
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

      io.to(chatId).emit("message-read", {
        chatId,
        messageId,
        userId,
        status: message.status,
        readBy: message.readBy,
      });
    } catch (error) {
      console.error("Message read error:", error);
    }
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

  socket.on("message-delivered", async (data = {}) => {
    const { chatId, messageId, userId, deliveredAt } = data;

    try {
      if (!chatId || !messageId || !userId) return;

      const message = await Message.findById(messageId);
      if (!message) return;

      const chat = await Chat.findById(chatId).select("users");
      if (!chat) return;

      const deliveredList = message.deliveredTo || [];
      const alreadyDelivered = deliveredList.some(
        (entry) => entry.user?.toString?.() === userId.toString()
      );

      if (!alreadyDelivered) {
        deliveredList.push({
          user: userId,
          deliveredAt: deliveredAt || new Date(),
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

      io.to(chatId).emit("message-delivered", {
        chatId,
        messageId,
        userId,
        deliveredAt: deliveredAt || new Date(),
        status: message.status,
        deliveredTo: message.deliveredTo,
      });
    } catch (error) {
      console.error("Message delivered error:", error);
    }
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
    console.log("User disconnected:", socket.id);
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

          console.log(`User ${userId} disconnected at ${lastSeen}`);
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
