const jwt = require("jsonwebtoken");
const User = require("../models/User");

// In-memory user cache with TTL to reduce DB lookups on every request
const userCache = new Map();
const CACHE_TTL_MS = 60 * 1000; // 1 minute

const getCachedUser = (userId) => {
  const cached = userCache.get(userId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.user;
  }
  userCache.delete(userId);
  return null;
};

const setCachedUser = (userId, user) => {
  userCache.set(userId, { user, timestamp: Date.now() });
  // Prevent unbounded cache growth
  if (userCache.size > 1000) {
    const oldestKey = userCache.keys().next().value;
    userCache.delete(oldestKey);
  }
};

// Invalidate cache for a specific user (call after profile updates)
const invalidateUserCache = (userId) => {
  userCache.delete(userId);
};

// Consistent cookie options used across the auth system
const getCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  path: "/",
});

const auth = async (req, res, next) => {
  try {
    let token = req.cookies.token;

    // Also check Authorization header as fallback
    if (!token && req.headers.authorization) {
      const authHeader = req.headers.authorization;
      if (authHeader.startsWith("Bearer ")) {
        token = authHeader.substring(7);
      }
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Access denied. No token provided.",
      });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Try cache first, fall back to DB
      let user = getCachedUser(decoded.userId);
      if (!user) {
        user = await User.findById(decoded.userId).select("-password").lean();
        if (user) {
          setCachedUser(decoded.userId, user);
        }
      }

      if (!user) {
        // Clear invalid cookie
        res.clearCookie("token", getCookieOptions());

        return res.status(401).json({
          success: false,
          message: "User not found",
        });
      }

      req.user = user;
      req.userId = decoded.userId;
      next();
    } catch (jwtError) {
      console.error("JWT verification failed:", jwtError.message);

      // Clear invalid cookie with consistent options
      res.clearCookie("token", getCookieOptions());

      if (jwtError.name === "TokenExpiredError") {
        return res.status(401).json({
          success: false,
          message: "Token expired. Please log in again.",
        });
      } else if (jwtError.name === "JsonWebTokenError") {
        return res.status(401).json({
          success: false,
          message: "Invalid token. Please log in again.",
        });
      } else {
        return res.status(401).json({
          success: false,
          message: "Token verification failed. Please log in again.",
        });
      }
    }
  } catch (error) {
    console.error("Auth middleware error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during authentication",
    });
  }
};

module.exports = auth;
module.exports.invalidateUserCache = invalidateUserCache;
module.exports.getCookieOptions = getCookieOptions;
