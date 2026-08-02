// Shared CORS origin-checking logic
// Used by both Express CORS middleware and Socket.io CORS config

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:3000",
  "https://dsync-chat.vercel.app",
  "https://dsync.suryapalanisamy.tech",
  process.env.FRONTEND_URL,
].filter(Boolean);

/**
 * Check if the given origin is allowed.
 * Returns true for:
 *  - No origin (non-browser clients)
 *  - Exact match in allowedOrigins
 *  - *.vercel.app subdomains (preview deployments)
 *  - Any localhost in development
 */
const checkOrigin = (origin, callback) => {
  // Allow requests with no origin (curl, mobile apps, server-to-server, socket.io non-browser)
  if (!origin) return callback(null, true);

  // Exact match
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

  return callback(new Error("Not allowed by CORS"));
};

module.exports = { allowedOrigins, checkOrigin };
