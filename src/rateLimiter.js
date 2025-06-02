/**
 * A Map that stores rate limiting information for each key.
 * 
 * The key is a unique identifier (user ID or IP address).
 * The value is an object containing:
 *   - limit {number}: Maximum number of allowed actions within the window.
 *   - windowMs {number}: Time window in milliseconds for rate limiting.
 *   - timestamps {number[]}: Array of timestamps representing action times.
 *   - lastAccess {number}: Timestamp of the last access.
 */
const limits = new Map();

// Default configuration
let defaultConfig = {
  limit: 10,
  windowMs: 60000,
};

function setDefaultConfig(limit, windowMs) {
  if (limit <= 0) throw new Error("Limit must be greater than 0");
  if (windowMs <= 0) throw new Error("Window duration must be greater than 0");

  defaultConfig = { limit, windowMs };
}

function getDefaultConfig() {
  return defaultConfig;
}

function checkLimit(key) {
  const now = Date.now();

  if (!limits.has(key)) {
    limits.set(key, {
      limit: defaultConfig.limit,
      windowMs: defaultConfig.windowMs,
      timestamps: [],
      lastAccess: now,
    });
  }

  const entry = limits.get(key);
  entry.lastAccess = now;

  // Clean expired timestamps
  entry.timestamps = entry.timestamps.filter((ts) => now - ts < entry.windowMs);

  const remaining = Math.max(0, entry.limit - entry.timestamps.length);
  const resetTime =
    entry.timestamps.length > 0
      ? new Date(Math.min(...entry.timestamps) + entry.windowMs)
      : new Date(now + entry.windowMs);

  if (entry.timestamps.length < entry.limit) {
    entry.timestamps.push(now);
    return {
      allowed: true,
      remaining: remaining - 1, // -1 because we just used 1
      resetTime: resetTime.toISOString(),
    };
  }

  return {
    allowed: false,
    remaining: 0,
    resetTime: resetTime.toISOString(),
  };
}

function updateLimit(key, newLimit, windowMs) {
  if (newLimit <= 0) throw new Error("Limit must be greater than 0");
  if (windowMs <= 0) throw new Error("Window duration must be greater than 0");

  if (!limits.has(key)) {
    limits.set(key, {
      limit: newLimit,
      windowMs,
      timestamps: [],
      lastAccess: Date.now(),
    });
  } else {
    const entry = limits.get(key);
    entry.limit = newLimit;
    entry.windowMs = windowMs;
  }
}

function getAllLimits() {
  const now = Date.now();
  const result = {};

  limits.forEach((entry, key) => {
    const activeTimestamps = entry.timestamps.filter(
      (ts) => now - ts < entry.windowMs
    );
    result[key] = {
      limit: entry.limit,
      windowMs: entry.windowMs,
      currentUsage: activeTimestamps.length,
      remaining: Math.max(0, entry.limit - activeTimestamps.length),
      lastAccess: new Date(entry.lastAccess).toISOString(),
    };
  });

  return result;
}

// Cleanup expired entries periodically to prevent memory leaks
function cleanupExpired() {
  const now = Date.now();
  const keysToDelete = [];

  limits.forEach((entry, key) => {
    entry.timestamps = entry.timestamps.filter(
      (ts) => now - ts < entry.windowMs
    );

    if (
      entry.timestamps.length === 0 &&
      now - entry.lastAccess > entry.windowMs * 2
    ) {
      keysToDelete.push(key);
    }
  });

  keysToDelete.forEach((key) => limits.delete(key));
  console.log(`Cleaned up ${keysToDelete.length} expired entries`);
}

export {
  checkLimit,
  updateLimit,
  setDefaultConfig,
  getDefaultConfig,
  getAllLimits,
  cleanupExpired,
};
