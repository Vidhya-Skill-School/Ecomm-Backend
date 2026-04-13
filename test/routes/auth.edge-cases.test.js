import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { build, createTestUser, getAuthToken } from "../helper.js";

describe("Authentication - Edge Cases (95% Coverage)", () => {
  let app;
  let accessToken;
  let testUser;

  beforeAll(async () => {
    app = await build();
    testUser = await createTestUser(app);
    accessToken = await getAuthToken(
      app,
      testUser.user.email,
      testUser.password,
    );
  });

  afterAll(async () => {
    await app.close();
  });

  describe("Password validation edge cases", () => {
    it("should return 400 for password shorter than 6 characters", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/auth/signup",
        payload: {
          email: `test_${Date.now()}@example.com`,
          name: "Test User",
          phone: "1234567890",
          password: "12345",
        },
      });
      expect(response.statusCode).toBe(400);
    });

    it("should return 400 for password longer than 100 characters", async () => {
      const longPassword = "a".repeat(101);
      const response = await app.inject({
        method: "POST",
        url: "/auth/signup",
        payload: {
          email: `test_${Date.now()}@example.com`,
          name: "Test User",
          phone: "1234567890",
          password: longPassword,
        },
      });
      expect(response.statusCode).toBe(400);
    });
  });

  describe("Phone validation edge cases", () => {
    it("should return 400 for phone with letters", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/auth/signup",
        payload: {
          email: `test_${Date.now()}@example.com`,
          name: "Test User",
          phone: "abcdefghij",
          password: "password123",
        },
      });
      expect(response.statusCode).toBe(400);
    });

    it("should return 400 for phone with 9 digits", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/auth/signup",
        payload: {
          email: `test_${Date.now()}@example.com`,
          name: "Test User",
          phone: "123456789",
          password: "password123",
        },
      });
      expect(response.statusCode).toBe(400);
    });
  });

  describe("Email validation edge cases", () => {
    it("should return 400 for email without @ symbol", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/auth/signup",
        payload: {
          email: "testexample.com",
          name: "Test User",
          phone: "1234567890",
          password: "password123",
        },
      });
      expect(response.statusCode).toBe(400);
    });

    it("should return 400 for email with spaces", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/auth/signup",
        payload: {
          email: "test @example.com",
          name: "Test User",
          phone: "1234567890",
          password: "password123",
        },
      });
      expect(response.statusCode).toBe(400);
    });
  });

  describe("Token validation edge cases", () => {
    it("should return 401 for malformed authorization header", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/account",
        headers: { authorization: "InvalidFormat" },
      });
      expect(response.statusCode).toBe(401);
    });

    it("should return 401 for empty token", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/account",
        headers: { authorization: "Bearer " },
      });
      expect(response.statusCode).toBe(401);
    });

    it("should return 401 for tampered token", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/account",
        headers: { authorization: "Bearer tampered.token.here" },
      });
      expect(response.statusCode).toBe(401);
    });
  });
});
