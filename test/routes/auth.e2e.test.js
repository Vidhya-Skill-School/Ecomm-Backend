import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  build,
  generateTestEmail,
  createTestUser,
  getAuthToken,
} from "../helper.js";

describe("Authentication Routes - E2E Tests", () => {
  let app;
  let testUser;
  let accessToken;

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

  describe("POST /auth/signup", () => {
    it("should create a new user successfully", async () => {
      const testEmail = generateTestEmail();

      const response = await app.inject({
        method: "POST",
        url: "/auth/signup",
        payload: {
          email: testEmail,
          name: "E2E Test User",
          phone: "1234567890",
          password: "password123",
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.message).toBe("User registered successfully");
      expect(body.user).toHaveProperty("id");
      expect(body.user.email).toBe(testEmail);
    });

    it("should return 409 for duplicate email", async () => {
      const testEmail = generateTestEmail();

      await app.inject({
        method: "POST",
        url: "/auth/signup",
        payload: {
          email: testEmail,
          name: "First User",
          phone: "1234567890",
          password: "password123",
        },
      });

      const response = await app.inject({
        method: "POST",
        url: "/auth/signup",
        payload: {
          email: testEmail,
          name: "Second User",
          phone: "0987654321",
          password: "password123",
        },
      });

      expect(response.statusCode).toBe(409);
      const body = JSON.parse(response.body);
      expect(body.message).toContain("already exists");
    });

    it("should return 400 for invalid email format", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/auth/signup",
        payload: {
          email: "invalid-email",
          name: "Test User",
          phone: "1234567890",
          password: "password123",
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toBe("Validation Error");
    });
  });

  describe("POST /auth/signin", () => {
    it("should login successfully with valid credentials", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/auth/signin",
        payload: {
          email: testUser.user.email,
          password: testUser.password,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.message).toBe("Login successful");
      expect(body).toHaveProperty("accessToken");
      expect(body).toHaveProperty("refreshToken");
    });

    it("should return 401 for invalid password", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/auth/signin",
        payload: {
          email: testUser.user.email,
          password: "wrongpassword",
        },
      });

      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      expect(body.message).toBe("Invalid email or password");
    });
  });

  describe("GET /account", () => {
    it("should get user account details with valid token", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/account",
        headers: { authorization: `Bearer ${accessToken}` },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty("id");
      expect(body).toHaveProperty("email", testUser.user.email);
      expect(body).toHaveProperty("name");
    });

    it("should return 401 without authorization header", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/account",
      });

      expect(response.statusCode).toBe(401);
    });
  });
});
