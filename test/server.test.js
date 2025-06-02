import * as chai from "chai";
import { request, default as chaiHttp } from "chai-http";
import { server, cleanupInterval } from "../src/server.js";

const { expect } = chai;

chai.use(chaiHttp);

describe("Rate Limiter API", function () {
  after(function () {
    if (cleanupInterval) {
      clearInterval(cleanupInterval);
      console.log("Cleanup interval cleared after tests");
    }
  });

  describe("GET /", function () {
    it("should return OK and rate limit headers", async function () {
      const res = await request.execute(server).get("/");
      expect(res).to.have.status(200);
      expect(res.body).to.have.property("message", "OK");

      expect(res).to.have.header("X-RateLimit-Remaining");
      expect(res).to.have.header("X-RateLimit-Reset");
      expect(res).to.have.header("X-RateLimit-Key");
    });
  });

  describe("Rate limiting", function () {
    it("should eventually return 429 after exceeding limit", async function () {
      const configRes = await request
        .execute(server)
        .get("/admin/config/default");
      
        const { limit } = configRes.body;
      let lastRes;
      
      for (let i = 0; i < limit + 1; i++) {
        lastRes = await request.execute(server).get("/");
      }

      expect(lastRes).to.have.status(429);
      expect(lastRes.body).to.have.property("error", "Too Many Requests");
    });
  });

  describe("Admin endpoints", function () {
    it("should get and update default config", async function () {
      const getRes = await request.execute(server).get("/admin/config/default");

      expect(getRes).to.have.status(200);
      expect(getRes.body).to.have.property("limit");
      expect(getRes.body).to.have.property("windowMs");

      const newConfig = { limit: 2, windowMs: 1000 };
      const postRes = await request
        .execute(server)
        .post("/admin/config/default")
        .send(newConfig);

      expect(postRes).to.have.status(200);
      expect(postRes.body.config).to.include(newConfig);
    });

    it("should update per-key config", async function () {
      const key = "user:testuser";
      const config = { limit: 2, windowMs: 1000 };
      const res = await request
        .execute(server)
        .post(`/admin/config/${key}`)
        .send(config);

      expect(res).to.have.status(200);
      expect(res.body).to.include({ key, limit: 2, windowMs: 1000 });
    });

    it("should return status", async function () {
      const res = await request.execute(server).get("/admin/status");

      expect(res).to.have.status(200);
      expect(res.body).to.have.property("defaultConfig");
      expect(res.body).to.have.property("activeLimits");
      expect(res.body).to.have.property("totalKeys");
    });
  });

  describe("Health endpoint", function () {
    it("should return healthy status", async function () {
      const res = await request.execute(server).get("/health");
      
      expect(res).to.have.status(200);
      expect(res.body).to.have.property("status", "healthy");
    });
  });
});
