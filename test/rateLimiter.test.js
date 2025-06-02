import { strict as assert } from "assert";
import {
  checkLimit,
  updateLimit,
  setDefaultConfig,
  getDefaultConfig,
  getAllLimits,
  cleanupExpired,
} from "../src/rateLimiter.js";

describe("rateLimiter", function () {
  beforeEach(function () {
    setDefaultConfig(3, 1000);
    cleanupExpired();
  });

  it("should allow requests within the limit", function () {
    const key = "user1";
    for (let i = 0; i < 3; i++) {
      const res = checkLimit(key);
      assert.equal(res.allowed, true);
      assert.equal(res.remaining, 2 - i);
    }
  });

  it("should block requests over the limit", function () {
    const key = "user2";
    for (let i = 0; i < 3; i++) checkLimit(key);
    const res = checkLimit(key);
    assert.equal(res.allowed, false);
    assert.equal(res.remaining, 0);
  });

  it("should reset after windowMs", function (done) {
    const key = "user3";
    for (let i = 0; i < 3; i++) checkLimit(key);
    setTimeout(() => {
      const res = checkLimit(key);
      assert.equal(res.allowed, true);
      assert.equal(res.remaining, 2);
      done();
    }, 1100);
  });

  it("should update limit and windowMs for a key", function () {
    const key = "user4";
    updateLimit(key, 5, 2000);
    for (let i = 0; i < 5; i++) {
      const res = checkLimit(key);
      assert.equal(res.allowed, true);
    }
    const res = checkLimit(key);
    assert.equal(res.allowed, false);
  });

  it("should return correct default config", function () {
    setDefaultConfig(7, 5000);
    const config = getDefaultConfig();
    assert.deepEqual(config, { limit: 7, windowMs: 5000 });
  });

  it("should return all limits with correct usage", function () {
    const key = "user5";
    checkLimit(key);
    const all = getAllLimits();
    assert.ok(all[key]);
    assert.equal(all[key].currentUsage, 1);
    assert.equal(all[key].remaining, 2);
  });

  it("should cleanup expired entries", function (done) {
    // Increase timeout to avoid "Timeout of 2000ms exceeded"
    this.timeout(3000);
    const key = "user6";
    checkLimit(key);
    setTimeout(() => {
      cleanupExpired();
      const all = getAllLimits();
      assert.ok(!all[key]);
      done();
    }, 2200);
  });

  it("should throw error for invalid config", function () {
    assert.throws(() => setDefaultConfig(0, 1000));
    assert.throws(() => setDefaultConfig(5, 0));
    assert.throws(() => updateLimit("user7", 0, 1000));
    assert.throws(() => updateLimit("user7", 5, 0));
  });
});
