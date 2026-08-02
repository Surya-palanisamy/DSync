const express = require("express");
const Chat = require("../models/Chat");
const auth = require("../middleware/auth");

const router = express.Router();

// Selective fields for populated users (instead of excluding password which still fetches all fields)
const USER_SELECT_FIELDS = "name email avatar isOnline lastSeen";

// Get all chats for user (excludes chats deleted for current user)
router.get("/", auth, async (req, res) => {
  try {
    const chats = await Chat.find({
      users: { $elemMatch: { $eq: req.userId } },
      deletedFor: { $ne: req.userId },
    })
      .populate("users", USER_SELECT_FIELDS)
      .populate("groupAdmin", USER_SELECT_FIELDS)
      .populate({
        path: "latestMessage",
        populate: {
          path: "sender",
          select: "name avatar",
        },
      })
      .sort({ updatedAt: -1 })
      .lean();

    // For each chat, check if latestMessage was created before user's clearedAt timestamp
    const processedChats = chats.map((chat) => {
      const userClearedEntry = (chat.clearedBy || []).find(
        (entry) => (entry.user?._id || entry.user)?.toString() === req.userId.toString()
      );

      if (userClearedEntry && userClearedEntry.clearedAt && chat.latestMessage) {
        const clearedTime = new Date(userClearedEntry.clearedAt).getTime();
        const latestTime = new Date(chat.latestMessage.createdAt).getTime();

        if (latestTime <= clearedTime + 2000) {
          return { ...chat, latestMessage: null };
        }
      }
      return chat;
    });

    res.json(processedChats);
  } catch (error) {
    console.error("Error fetching chats:", error);
    res.status(500).json({ message: error.message });
  }
});

// Create or access one-on-one chat
router.post("/", auth, async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ message: "User ID required" });
    }

    const isChat = await Chat.find({
      isGroupChat: false,
      $and: [
        { users: { $elemMatch: { $eq: req.userId } } },
        { users: { $elemMatch: { $eq: userId } } },
      ],
    })
      .populate("users", USER_SELECT_FIELDS)
      .populate({
        path: "latestMessage",
        populate: {
          path: "sender",
          select: "name avatar",
        },
      })
      .lean();

    if (isChat.length > 0) {
      const chat = isChat[0];
      // Un-delete chat for current user if it was deleted
      if (chat.deletedFor && chat.deletedFor.some((id) => id.toString() === req.userId.toString())) {
        await Chat.findByIdAndUpdate(chat._id, {
          $pull: { deletedFor: req.userId },
        });
      }
      return res.json(chat);
    }

    const chatData = {
      chatName: "sender",
      isGroupChat: false,
      users: [req.userId, userId],
    };

    const createdChat = await Chat.create(chatData);
    const fullChat = await Chat.findOne({ _id: createdChat._id })
      .populate("users", USER_SELECT_FIELDS)
      .lean();

    res.status(201).json(fullChat);
  } catch (error) {
    console.error("Error creating/accessing one-on-one chat:", error);
    res.status(500).json({ message: error.message });
  }
});

// Create group chat
router.post("/group", auth, async (req, res) => {
  try {
    const { users, name } = req.body;

    if (!users || !name) {
      return res.status(400).json({ message: "Please fill all fields" });
    }

    let parsedUsers;
    try {
      parsedUsers = typeof users === "string" ? JSON.parse(users) : users;
    } catch (parseError) {
      return res.status(400).json({ message: "Invalid users format" });
    }

    if (!Array.isArray(parsedUsers) || parsedUsers.length < 2) {
      return res
        .status(400)
        .json({ message: "More than 2 users required for group chat" });
    }

    parsedUsers.push(req.userId);

    const groupChat = await Chat.create({
      chatName: name,
      users: parsedUsers,
      isGroupChat: true,
      groupAdmin: req.userId,
    });

    const fullGroupChat = await Chat.findOne({ _id: groupChat._id })
      .populate("users", USER_SELECT_FIELDS)
      .populate("groupAdmin", USER_SELECT_FIELDS)
      .lean();

    res.status(201).json(fullGroupChat);
  } catch (error) {
    console.error("Error creating group chat:", error);
    res.status(500).json({ message: error.message });
  }
});

// Get single chat by id (ensures membership)
router.get("/:chatId", auth, async (req, res) => {
  try {
    const { chatId } = req.params;

    const chat = await Chat.findOne({
      _id: chatId,
      users: { $elemMatch: { $eq: req.userId } },
      deletedFor: { $ne: req.userId },
    })
      .populate("users", USER_SELECT_FIELDS)
      .populate("groupAdmin", USER_SELECT_FIELDS)
      .populate({
        path: "latestMessage",
        populate: {
          path: "sender",
          select: "name avatar",
        },
      })
      .lean();

    if (!chat) {
      return res.status(404).json({ message: "Chat not found" });
    }

    res.json(chat);
  } catch (error) {
    console.error("Error fetching chat by id:", error);
    res.status(500).json({ message: error.message });
  }
});

// Clear messages in a chat for current user (Instagram style)
router.delete("/:chatId/messages", auth, async (req, res) => {
  try {
    const { chatId } = req.params;

    const chat = await Chat.findOne({
      _id: chatId,
      users: { $elemMatch: { $eq: req.userId } },
    });

    if (!chat) {
      return res.status(403).json({ message: "Access denied or chat not found" });
    }

    // Update or add clearedBy timestamp for req.userId
    const existingIndex = (chat.clearedBy || []).findIndex(
      (entry) => (entry.user?._id || entry.user)?.toString() === req.userId.toString()
    );

    const now = new Date(Date.now() + 1000);
    if (existingIndex !== -1) {
      chat.clearedBy[existingIndex].clearedAt = now;
    } else {
      chat.clearedBy = chat.clearedBy || [];
      chat.clearedBy.push({ user: req.userId, clearedAt: now });
    }

    await chat.save();

    res.json({ success: true, message: "Chat cleared for you" });
  } catch (error) {
    console.error("Clear chat error:", error);
    res.status(500).json({ message: "Failed to clear chat messages" });
  }
});

// Delete chat for current user (Instagram style soft-delete)
router.delete("/:chatId", auth, async (req, res) => {
  try {
    const { chatId } = req.params;

    const chat = await Chat.findOne({
      _id: chatId,
      users: { $elemMatch: { $eq: req.userId } },
    });

    if (!chat) {
      return res.status(403).json({ message: "Access denied or chat not found" });
    }

    // Add req.userId to deletedFor array if not already present
    const isDeleted = (chat.deletedFor || []).some(
      (id) => (id?._id || id)?.toString() === req.userId.toString()
    );

    if (!isDeleted) {
      chat.deletedFor = chat.deletedFor || [];
      chat.deletedFor.push(req.userId);
    }

    // Also update clearedBy timestamp so if the user re-opens chat later, previous messages remain hidden
    const existingIndex = (chat.clearedBy || []).findIndex(
      (entry) => (entry.user?._id || entry.user)?.toString() === req.userId.toString()
    );

    const now = new Date(Date.now() + 1000);
    if (existingIndex !== -1) {
      chat.clearedBy[existingIndex].clearedAt = now;
    } else {
      chat.clearedBy = chat.clearedBy || [];
      chat.clearedBy.push({ user: req.userId, clearedAt: now });
    }

    await chat.save();

    res.json({ success: true, message: "Chat deleted for you" });
  } catch (error) {
    console.error("Delete chat error:", error);
    res.status(500).json({ message: "Failed to delete chat" });
  }
});

module.exports = router;
