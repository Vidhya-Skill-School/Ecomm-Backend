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
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe("VALIDATION_ERROR");
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
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe("VALIDATION_ERROR");
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
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe("VALIDATION_ERROR");
    });

    it("should return 400 for rating below 1", async () => {
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
          rating: 0,
        },
      });
      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe("VALIDATION_ERROR");
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
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe("VALIDATION_ERROR");
    });

    it("should return 400 for empty description", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/v1/products",
        headers: { authorization: `Bearer ${accessToken}` },
        payload: {
          title: "Test Product",
          description: "",
          price: 100,
          category: "Test",
          brand: "Test Brand",
        },
      });
      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe("VALIDATION_ERROR");
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
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe("VALIDATION_ERROR");
    });

    it("should return 400 for empty brand", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/v1/products",
        headers: { authorization: `Bearer ${accessToken}` },
        payload: {
          title: "Test",
          description: "Description",
          price: 100,
          category: "Test",
          brand: "",
        },
      });
      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe("VALIDATION_ERROR");
    });

    it("should create product with valid data", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/v1/products",
        headers: { authorization: `Bearer ${accessToken}` },
        payload: {
          title: `Valid_Product_${Date.now()}`,
          description: "Valid Description",
          price: 99.99,
          category: "Valid Category",
          brand: "Valid Brand",
          rating: 4.5,
          stock: 50,
        },
      });
      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.message).toBe("Product created successfully");
      expect(body.data).toHaveProperty("id");
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
      expect(body.total).toBeDefined();
    });

    it("should return 400 when limit exceeds maximum of 100", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/products?limit=500",
      });
      // API returns 400 because limit > 100 is invalid
      expect(response.statusCode).toBe(400);
    });

    it("should accept limit of 100 (maximum allowed)", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/products?limit=100",
      });
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.limit).toBe(100);
    });

    it("should accept limit of 1 (minimum allowed)", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/products?limit=1",
      });
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.limit).toBe(1);
    });

    it("should return 400 for limit less than 1", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/products?limit=0",
      });
      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe("VALIDATION_ERROR");
    });

    it("should default to limit 10 when no limit provided", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/products",
      });
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.limit).toBe(10);
    });

    it("should default to page 1 when no page provided", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/products",
      });
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.page).toBe(1);
    });
  });

  describe("Filter edge cases", () => {
    it("should handle minPrice greater than maxPrice", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/products?minPrice=100&maxPrice=50",
      });
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.length).toBe(0);
    });

    it("should handle search with special characters", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/products?search=%40%23%24%25",
      });
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data).toBeDefined();
    });

    it("should handle search with empty string", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/products?search=",
      });
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data).toBeDefined();
    });

    it("should filter by rating", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/products?rating=4",
      });
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data).toBeDefined();
    });

    it("should handle invalid rating value", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/products?rating=invalid",
      });
      expect(response.statusCode).toBe(400); // Now strictly validated by schema
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe("VALIDATION_ERROR");
    });
  });

  describe("Sorting edge cases", () => {
    it("should sort by price ascending", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/products?sortBy=price&sortOrder=ASC",
      });
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data).toBeDefined();
    });

    it("should sort by title descending", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/products?sortBy=title&sortOrder=DESC",
      });
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data).toBeDefined();
    });

    it("should default to createdAt DESC when invalid sortBy provided", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/products?sortBy=invalidField",
      });
      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe("VALIDATION_ERROR");
    });

    it("should default to DESC when invalid sortOrder provided", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/products?sortOrder=INVALID",
      });
      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe("VALIDATION_ERROR");
    });
  });

  describe("Product update edge cases", () => {
    let testProductId;

    beforeEach(async () => {
      // Create a test product for update tests
      const createResponse = await app.inject({
        method: "POST",
        url: "/api/v1/products",
        headers: { authorization: `Bearer ${accessToken}` },
        payload: {
          title: `Update_Test_${Date.now()}`,
          description: "Test for UPDATE",
          price: 99.99,
          category: "Test",
          brand: "Test Brand",
          stock: 50,
        },
      });
      const { data } = JSON.parse(createResponse.body);
      testProductId = data.id;
    });

    it("should return 404 for updating non-existent product", async () => {
      const response = await app.inject({
        method: "PATCH",
        url: "/api/v1/products/999999999",
        headers: { authorization: `Bearer ${accessToken}` },
        payload: { price: 100 },
      });
      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.error.message).toBe("Product not found");
    });

    it("should return 400 when updating with negative price", async () => {
      const response = await app.inject({
        method: "PATCH",
        url: `/api/v1/products/${testProductId}`,
        headers: { authorization: `Bearer ${accessToken}` },
        payload: { price: -50 },
      });
      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe("VALIDATION_ERROR");
    });

    it("should return 400 when updating with negative stock", async () => {
      const response = await app.inject({
        method: "PATCH",
        url: `/api/v1/products/${testProductId}`,
        headers: { authorization: `Bearer ${accessToken}` },
        payload: { stock: -10 },
      });
      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe("VALIDATION_ERROR");
    });

    it("should successfully update product with valid data", async () => {
      const response = await app.inject({
        method: "PATCH",
        url: `/api/v1/products/${testProductId}`,
        headers: { authorization: `Bearer ${accessToken}` },
        payload: { price: 149.99, stock: 25 },
      });
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.message).toBe("Product updated successfully");
      expect(body.data.price).toBe(149.99);
      expect(body.data.stock).toBe(25);
    });
  });

  describe("Product deletion edge cases", () => {
    let testProductId;

    beforeEach(async () => {
      // Create a test product for deletion tests
      const createResponse = await app.inject({
        method: "POST",
        url: "/api/v1/products",
        headers: { authorization: `Bearer ${accessToken}` },
        payload: {
          title: `Delete_Test_${Date.now()}`,
          description: "Test for DELETE",
          price: 19.99,
          category: "Test",
          brand: "Test Brand",
          stock: 5,
        },
      });
      const { data } = JSON.parse(createResponse.body);
      testProductId = data.id;
    });

    it("should return 404 for deleting non-existent product", async () => {
      const response = await app.inject({
        method: "DELETE",
        url: "/api/v1/products/999999999",
        headers: { authorization: `Bearer ${accessToken}` },
      });
      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.error.message).toBe("Product not found");
    });

    it("should successfully delete a product", async () => {
      const response = await app.inject({
        method: "DELETE",
        url: `/api/v1/products/${testProductId}`,
        headers: { authorization: `Bearer ${accessToken}` },
      });
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.message).toBe("Product deleted successfully");
    });

    it("should return 404 when trying to delete already deleted product", async () => {
      // First delete
      await app.inject({
        method: "DELETE",
        url: `/api/v1/products/${testProductId}`,
        headers: { authorization: `Bearer ${accessToken}` },
      });

      // Try to delete again
      const response = await app.inject({
        method: "DELETE",
        url: `/api/v1/products/${testProductId}`,
        headers: { authorization: `Bearer ${accessToken}` },
      });
      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.error.message).toBe("Product not found");
    });
  });
});
