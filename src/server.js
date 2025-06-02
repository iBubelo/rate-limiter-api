import express from "express";
import {
  checkLimit,
  updateLimit,
  setDefaultConfig,
  getDefaultConfig,
  getAllLimits,
  cleanupExpired,
} from "./rateLimiter.js";

const app = express();

let server;
let cleanupInterval;

app.use(express.json());

// Rate limiting middleware (skip admin and health endpoints)
app.use((req, res, next) => {
  if (req.path.startsWith("/admin/") || req.path === "/health") {
    return next();
  }

  // Create key: user-based if username provided, otherwise IP-based
  const username = req.query.user || req.headers["x-user"] || req.body?.user;
  const key = username ? `user:${username}` : `ip:${req.ip}`;

  try {
    const { allowed, remaining, resetTime } = checkLimit(key);

    // Add rate limit headers
    res.set("X-RateLimit-Remaining", remaining.toString());
    res.set("X-RateLimit-Reset", resetTime);
    res.set("X-RateLimit-Key", key);

    if (!allowed) {
      return res.status(429).json({
        error: "Too Many Requests",
        key: key,
        retryAfter: resetTime,
      });
    }

    next();
  } catch (error) {
    console.error("Rate limiting error:", error);
    next();
  }
});

// Main endpoint
app.get("/", (req, res) => {
  res.json({ message: "OK", timestamp: new Date().toISOString() });
});

// Configuration endpoints
app.get("/admin/config/default", (req, res) => {
  res.json(getDefaultConfig());
});

app.post("/admin/config/default", (req, res) => {
  try {
    const { limit, windowMs } = req.body;

    if (!limit || !windowMs) {
      return res.status(400).json({
        error: "Both 'limit' and 'windowMs' are required",
      });
    }

    setDefaultConfig(limit, windowMs);
    res.json({
      message: "Default configuration updated",
      config: getDefaultConfig(),
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post("/admin/config/:key", (req, res) => {
  try {
    const { key } = req.params;
    const { limit, windowMs } = req.body;

    if (!limit || !windowMs) {
      return res.status(400).json({
        error: "Both 'limit' and 'windowMs' are required",
      });
    }

    updateLimit(key, limit, windowMs);
    res.json({
      message: `Rate limit updated for key: ${key}`,
      key,
      limit,
      windowMs,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Status endpoint
app.get("/admin/status", (req, res) => {
  const limits = getAllLimits();
  res.json({
    defaultConfig: getDefaultConfig(),
    activeLimits: limits,
    totalKeys: Object.keys(limits).length,
    timestamp: new Date().toISOString(),
  });
});

// Health check
app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

const PORT = process.env.PORT || 3000;
server = app.listen(PORT, () => {
  console.log(`Rate limiter server running on port ${PORT}`);
  console.log(`Default config: ${JSON.stringify(getDefaultConfig())}`);
  cleanupInterval = setInterval(cleanupExpired, 60000);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  server.close(() => {
    clearInterval(cleanupInterval);
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  server.close(() => {
    clearInterval(cleanupInterval);
    process.exit(0);
  });
});

export { app as server, cleanupInterval };
