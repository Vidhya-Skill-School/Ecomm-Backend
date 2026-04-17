import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  build,
  createTestUser,
  getAuthToken,
  createTestProduct,
} from "../helper.js";

describe("Orders Routes - E2E Tests", () => {
  let app;
  let accessToken;
  let testUser;
  let testProductId;

  beforeAll(async () => {
    app = await build();

    // Create test user and get token
    testUser = await createTestUser(app);
    accessToken = await getAuthToken(
      app,
      testUser.user.email,
      testUser.password,
    );

    // Create a test product for order tests
    const product = await createTestProduct(app, accessToken, {
      title: `Order_Test_Product_${Date.now()}`,
      price: 49.99,
      stock: 100,
    });
    testProductId = product.id;

    // Add product to cart
    await app.inject({
      method: "POST",
      url: "/api/v1/cart",
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { productId: testProductId, quantity: 2 },
    });
  });

  afterAll(async () => {
    await app.close();
  });

  describe("POST /checkout", () => {
    it("should create checkout successfully", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/v1/checkout",
        headers: { authorization: `Bearer ${accessToken}` },
        payload: { shippingAddress: "123 Test Street, Test City" },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty("orderId");
      expect(body).toHaveProperty("orderNumber");
      expect(body).toHaveProperty("checkoutId");
      expect(body).toHaveProperty("totalAmount");
      expect(body.status).toBe("pending_payment");
    });

    it("should return 401 without authentication", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/v1/checkout",
        payload: { shippingAddress: "123 Test Street" },
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe("POST /orders/confirm/:checkoutId", () => {
    let checkoutId;

    beforeAll(async () => {
      // Create a checkout first
      const checkoutResponse = await app.inject({
        method: "POST",
        url: "/api/v1/checkout",
        headers: { authorization: `Bearer ${accessToken}` },
        payload: { shippingAddress: "123 Test Street" },
      });
      const checkoutBody = JSON.parse(checkoutResponse.body);
      checkoutId = checkoutBody.checkoutId;
    });

    it("should confirm order successfully", async () => {
      const response = await app.inject({
        method: "POST",
        url: `/api/v1/orders/confirm/${checkoutId}`,
        headers: { authorization: `Bearer ${accessToken}` },
        payload: { paymentId: `pay_${Date.now()}` },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty("orderNumber");
      expect(body).toHaveProperty("paymentId");
      expect(body.status).toBe("confirmed");
    });

    it("should return 400 for missing paymentId", async () => {
      const response = await app.inject({
        method: "POST",
        url: `/api/v1/orders/confirm/${checkoutId}`,
        headers: { authorization: `Bearer ${accessToken}` },
        payload: {},
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error?.code || body.code).toBe("VALIDATION_ERROR");
    });
  });

  describe("POST /orders/cancel/:checkoutId", () => {
    let checkoutId;

    beforeAll(async () => {
      // Add product to cart again
      await app.inject({
        method: "POST",
        url: "/api/v1/cart",
        headers: { authorization: `Bearer ${accessToken}` },
        payload: { productId: testProductId, quantity: 1 },
      });

      // Create a checkout
      const checkoutResponse = await app.inject({
        method: "POST",
        url: "/api/v1/checkout",
        headers: { authorization: `Bearer ${accessToken}` },
        payload: { shippingAddress: "123 Test Street" },
      });
      const checkoutBody = JSON.parse(checkoutResponse.body);
      checkoutId = checkoutBody.checkoutId;
    });

    it("should cancel order successfully", async () => {
      const response = await app.inject({
        method: "POST",
        url: `/api/v1/orders/cancel/${checkoutId}`,
        headers: { authorization: `Bearer ${accessToken}` },
        payload: { reason: "Changed my mind" },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.status).toBe("cancelled");
    });

    it("should cancel order with default reason", async () => {
      // Create another checkout
      const checkoutResponse = await app.inject({
        method: "POST",
        url: "/api/v1/checkout",
        headers: { authorization: `Bearer ${accessToken}` },
        payload: { shippingAddress: "123 Test Street" },
      });
      const checkoutBody = JSON.parse(checkoutResponse.body);
      const newCheckoutId = checkoutBody.checkoutId;

      const response = await app.inject({
        method: "POST",
        url: `/api/v1/orders/cancel/${newCheckoutId}`,
        headers: { authorization: `Bearer ${accessToken}` },
        payload: {},
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.status).toBe("cancelled");
    });
  });

  describe("GET /orders", () => {
    it("should get user orders", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/orders",
        headers: { authorization: `Bearer ${accessToken}` },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(Array.isArray(body)).toBe(true);
    });

    it("should return 401 without authentication", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/orders",
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe("GET /orders/track/:orderNumber", () => {
    let orderNumber;

    beforeAll(async () => {
      // Create and confirm an order
      await app.inject({
        method: "POST",
        url: "/api/v1/cart",
        headers: { authorization: `Bearer ${accessToken}` },
        payload: { productId: testProductId, quantity: 1 },
      });

      const checkoutResponse = await app.inject({
        method: "POST",
        url: "/api/v1/checkout",
        headers: { authorization: `Bearer ${accessToken}` },
        payload: { shippingAddress: "123 Test Street" },
      });
      const checkoutBody = JSON.parse(checkoutResponse.body);

      const confirmResponse = await app.inject({
        method: "POST",
        url: `/api/v1/orders/confirm/${checkoutBody.checkoutId}`,
        headers: { authorization: `Bearer ${accessToken}` },
        payload: { paymentId: `pay_${Date.now()}` },
      });
      const confirmBody = JSON.parse(confirmResponse.body);
      orderNumber = confirmBody.orderNumber;
    });

    it("should track order by order number", async () => {
      const response = await app.inject({
        method: "GET",
        url: `/api/v1/orders/track/${orderNumber}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty("orderNumber", orderNumber);
      expect(body).toHaveProperty("status");
    });

    it("should return 404 for non-existent order", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/orders/track/INVALID-ORDER-123",
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.error?.message || body.message).toBe("Order not found");
    });
  });

  describe("GET /orders/:orderId", () => {
    let orderId;

    beforeAll(async () => {
      // Create and confirm an order
      await app.inject({
        method: "POST",
        url: "/api/v1/cart",
        headers: { authorization: `Bearer ${accessToken}` },
        payload: { productId: testProductId, quantity: 1 },
      });

      const checkoutResponse = await app.inject({
        method: "POST",
        url: "/api/v1/checkout",
        headers: { authorization: `Bearer ${accessToken}` },
        payload: { shippingAddress: "123 Test Street" },
      });
      const checkoutBody = JSON.parse(checkoutResponse.body);

      const confirmResponse = await app.inject({
        method: "POST",
        url: `/api/v1/orders/confirm/${checkoutBody.checkoutId}`,
        headers: { authorization: `Bearer ${accessToken}` },
        payload: { paymentId: `pay_${Date.now()}` },
      });
      const confirmBody = JSON.parse(confirmResponse.body);
      orderId = confirmBody.id;
    });

    it("should get specific order by ID", async () => {
      const response = await app.inject({
        method: "GET",
        url: `/api/v1/orders/${orderId}`,
        headers: { authorization: `Bearer ${accessToken}` },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty("id", orderId);
      expect(body).toHaveProperty("orderNumber");
      expect(body).toHaveProperty("status");
    });

    it("should return 404 for non-existent order", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/orders/999999999",
        headers: { authorization: `Bearer ${accessToken}` },
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.error?.message || body.message).toBe("Order not found");
    });

    it("should return 403 for order belonging to another user", async () => {
      // Create another user
      const anotherUser = await createTestUser(app);
      const anotherToken = await getAuthToken(
        app,
        anotherUser.user.email,
        anotherUser.password,
      );

      const response = await app.inject({
        method: "GET",
        url: `/api/v1/orders/${orderId}`,
        headers: { authorization: `Bearer ${anotherToken}` },
      });

      const body = JSON.parse(response.body);
      if (response.statusCode !== 403) {
        console.log("DEBUG - 403 test failed. Received body:", JSON.stringify(body, null, 2));
      }
      expect(response.statusCode).toBe(403);
      expect(body.error?.message || body.message).toBe("You do not have permission to view this order");
    });
  });

  describe("GET /categories", () => {
    it("should return all categories", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/categories",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(Array.isArray(body)).toBe(true);
    });
  });

  describe("GET /statistics", () => {
    it("should return API statistics", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/statistics",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty("totalProducts");
      expect(body).toHaveProperty("totalCategories");
      expect(body).toHaveProperty("totalBrands");
      expect(body).toHaveProperty("avgPrice");
    });
  });
});
