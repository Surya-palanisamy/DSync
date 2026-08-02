const express = require("express");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const auth = require("../middleware/auth");
const { invalidateUserCache, getCookieOptions } = require("../middleware/auth");
const multer = require("multer");
const cloudinary = require("../config/cloudinaryConfig");

const router = express.Router();

// Configure multer for avatar uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"), false);
    }
  },
});

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Helper function to generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: "30d",
  });
};

// Helper function to set secure cookie
const setTokenCookie = (res, token) => {
  const cookieOptions = {
    ...getCookieOptions(),
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  };

  res.cookie("token", token, cookieOptions);
};

// Helper function to clear cookie
const clearTokenCookie = (res) => {
  res.clearCookie("token", getCookieOptions());
};

// Helper function to format user response
const formatUserResponse = (user) => {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    avatar: user.avatar,
    isOnline: user.isOnline,
    lastSeen: user.lastSeen,
  };
};

// Register
router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Validation
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    // Email format validation
    if (!EMAIL_REGEX.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Invalid email format",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters",
      });
    }

    if (name.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: "Name must be at least 2 characters",
      });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() }).lean();
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User already exists",
      });
    }

    const user = new User({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
    });
    await user.save();

    const token = generateToken(user._id);
    setTokenCookie(res, token);

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      user: formatUserResponse(user),
    });
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({
      success: false,
      message: "Registration failed",
    });
  }
});

// Login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    // Email format validation
    if (!EMAIL_REGEX.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // Update user status
    user.isOnline = true;
    user.lastSeen = new Date();
    await user.save();

    // Invalidate any cached version of this user
    invalidateUserCache(user._id.toString());

    const token = generateToken(user._id);
    setTokenCookie(res, token);

    res.json({
      success: true,
      message: "Login successful",
      user: formatUserResponse(user),
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      success: false,
      message: "Login failed",
    });
  }
});

// Get current user - This is the key endpoint for persistence
router.get("/me", auth, async (req, res) => {
  try {
    // req.user is already populated by the auth middleware (and may be cached)
    const user = req.user;
    if (!user) {
      clearTokenCookie(res);
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.json({
      success: true,
      user: formatUserResponse(user),
    });
  } catch (error) {
    console.error("Get user error:", error);
    clearTokenCookie(res);
    res.status(500).json({
      success: false,
      message: "Failed to get user data",
    });
  }
});

// Logout
router.post("/logout", auth, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.userId, {
      isOnline: false,
      lastSeen: new Date(),
    });

    invalidateUserCache(req.userId.toString());
    clearTokenCookie(res);

    res.json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    console.error("Logout error:", error);
    clearTokenCookie(res);
    res.status(500).json({
      success: false,
      message: "Logout failed",
    });
  }
});

// Update profile
router.put("/profile", auth, async (req, res) => {
  try {
    const { name, email } = req.body;
    const user = await User.findById(req.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Validation
    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Name is required",
      });
    }

    // Check if email is already taken by another user
    if (email && email !== user.email) {
      if (!EMAIL_REGEX.test(email)) {
        return res.status(400).json({
          success: false,
          message: "Invalid email format",
        });
      }

      const existingUser = await User.findOne({
        email: email.toLowerCase().trim(),
        _id: { $ne: req.userId },
      }).lean();
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: "Email already in use",
        });
      }
    }

    if (name) user.name = name.trim();
    if (email) user.email = email.toLowerCase().trim();

    await user.save();

    // Invalidate cached user data
    invalidateUserCache(req.userId.toString());

    res.json({
      success: true,
      message: "Profile updated successfully",
      user: formatUserResponse(user),
    });
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update profile",
    });
  }
});

// Upload avatar
router.post("/avatar", auth, upload.single("avatar"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No image file provided",
      });
    }

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Upload to cloudinary
    const result = await new Promise((resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          {
            resource_type: "image",
            folder: "chat-app/avatars",
            transformation: [
              { width: 200, height: 200, crop: "fill", gravity: "face" },
              { quality: "auto", fetch_format: "auto" },
            ],
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        )
        .end(req.file.buffer);
    });

    // Delete old avatar from cloudinary if exists
    if (user.avatar && user.avatar.includes("cloudinary")) {
      try {
        const publicId = user.avatar.split("/").pop().split(".")[0];
        await cloudinary.uploader.destroy(`chat-app/avatars/${publicId}`);
      } catch (deleteError) {
        console.log("Failed to delete old avatar:", deleteError);
      }
    }

    user.avatar = result.secure_url;
    await user.save();

    // Invalidate cached user data
    invalidateUserCache(req.userId.toString());

    res.json({
      success: true,
      message: "Avatar updated successfully",
      user: formatUserResponse(user),
    });
  } catch (error) {
    console.error("Avatar upload error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to upload avatar",
    });
  }
});

// Search users (Optimized)
router.get("/users", auth, async (req, res) => {
  try {
    const { search } = req.query;

    // Support single character searches for fast instant search
    if (!search || typeof search !== "string" || !search.trim()) {
      return res.json([]);
    }

    const rawTerm = search.trim();
    // Escape regex special characters to prevent regex injection or crashes
    const escapedTerm = rawTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(escapedTerm, "i");

    // Search for users excluding current user
    const users = await User.find({
      _id: { $ne: req.userId },
      $or: [{ name: regex }, { email: regex }],
    })
      .select("name email avatar isOnline lastSeen")
      .limit(15)
      .lean();

    // Format the response
    const formattedUsers = users.map((user) => ({
      _id: user._id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      isOnline: user.isOnline,
      lastSeen: user.lastSeen,
    }));

    res.json(formattedUsers);
  } catch (error) {
    console.error("Search users error:", error);
    res.status(500).json({
      success: false,
      message: "Search failed. Please try again.",
    });
  }
});

// Refresh token
router.post("/refresh", auth, async (req, res) => {
  try {
    const user = req.user;
    if (!user) {
      clearTokenCookie(res);
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const token = generateToken(user._id);
    setTokenCookie(res, token);

    res.json({
      success: true,
      message: "Token refreshed successfully",
      user: formatUserResponse(user),
    });
  } catch (error) {
    console.error("Refresh token error:", error);
    clearTokenCookie(res);
    res.status(500).json({
      success: false,
      message: "Failed to refresh token",
    });
  }
});

module.exports = router;
