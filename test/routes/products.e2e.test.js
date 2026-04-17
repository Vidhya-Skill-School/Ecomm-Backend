import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { build, createTestUser, getAuthToken } from "../helper.js";

describe("Products - Edge Cases (95% Coverage)", () => {
  let app;
  let accessToken;

  beforeAll(async () => {
    app = await build();
    const testUser = await createTestUser(app);
    accessToken = await getAuthToken(
      app,
      testUser.user.email,
      testUser.password,
    );
  });

  afterAll(async () => {
    await app.close();
  });

  describe("Product creation edge cases", () => {
    it("should return 400 for negative price", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/v1/products",
        headers: { authorization: `Bearer ${accessToken}` },
        payload: {
          title: "Test Product",
          description: "Description",
          price: -10,
          category: "Test",
          brand: "Test Brand",
        },
      });
      expect(response.statusCode).toBe(400);
    });

    it("should return 400 for negative stock", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/v1/products",
        headers: { authorization: `Bearer ${accessToken}` },
        payload: {
          title: "Test Product",
          description: "Description",
          price: 100,
          category: "Test",
          brand: "Test Brand",
          stock: -5,
        },
      });
      expect(response.statusCode).toBe(400);
    });

    it("should return 400 for rating above 5", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/v1/products",
        headers: { authorization: `Bearer ${accessToken}` },
        payload: {
          title: "Test Product",
          description: "Description",
          price: 100,
          category: "Test",
          brand: "Test Brand",
          rating: 6,
        },
      });
      expect(response.statusCode).toBe(400);
    });

    it("should return 400 for empty title", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/v1/products",
        headers: { authorization: `Bearer ${accessToken}` },
        payload: {
          title: "",
          description: "Description",
          price: 100,
          category: "Test",
          brand: "Test Brand",
        },
      });
      expect(response.statusCode).toBe(400);
    });

    it("should return 400 for empty category", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/v1/products",
        headers: { authorization: `Bearer ${accessToken}` },
        payload: {
          title: "Test",
          description: "Description",
          price: 100,
          category: "",
          brand: "Test Brand",
        },
      });
      expect(response.statusCode).toBe(400);
    });
  });

  describe("Pagination edge cases", () => {
    it("should handle page beyond available data", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/products?page=9999&limit=10",
      });
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.length).toBe(0);
    });

    it("should respect max limit of 100", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/products?limit=500",
      });
      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error?.code || body.code).toBe("VALIDATION_ERROR");
      expect(body.error?.details?.fieldErrors?.[0]?.issue).toBe("must be <= 100");
    });
  });
});
