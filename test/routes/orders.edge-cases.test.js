import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  build,
  createTestUser,
  getAuthToken,
  createTestProduct,
} from "../helper.js";

describe("Orders - Edge Cases (95% Coverage)", () => {
  let app;
  let accessToken;
  let testUser;
  let testProductId;

  beforeAll(async () => {
    app = await build();
    testUser = await createTestUser(app);
    accessToken = await getAuthToken(
      app,
      testUser.user.email,
      testUser.password,
    );

    const product = await createTestProduct(app, accessToken, {
      title: `Order_Edge_${Date.now()}`,
      price: 49.99,
      stock: 100,
    });
    testProductId = product.id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe("Checkout edge cases", () => {
    it("should return 400 when cart is empty", async () => {
      await app.inject({
        method: "DELETE",
        url: "/api/v1/cart",
        headers: { authorization: `Bearer ${accessToken}` },
      });

      const response = await app.inject({
        method: "POST",
        url: "/api/v1/checkout",
        headers: { authorization: `Bearer ${accessToken}` },
        payload: { shippingAddress: "123 Test St" },
      });
      expect(response.statusCode).toBe(400);
    });

    it("should handle checkout without shipping address", async () => {
      await app.inject({
        method: "POST",
        url: "/api/v1/cart",
        headers: { authorization: `Bearer ${accessToken}` },
        payload: { productId: testProductId, quantity: 1 },
      });

      const response = await app.inject({
        method: "POST",
        url: "/api/v1/checkout",
        headers: { authorization: `Bearer ${accessToken}` },
        payload: {},
      });
      expect(response.statusCode).toBe(200);
    });
  });

  describe("Order confirmation edge cases", () => {
    it("should return 404 for non-existent checkoutId", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/v1/orders/confirm/non-existent-id",
        headers: { authorization: `Bearer ${accessToken}` },
        payload: { paymentId: "pay_123" },
      });
      expect(response.statusCode).toBe(404);
    });

    it("should return 400 for already confirmed order", async () => {
      await app.inject({
        method: "POST",
        url: "/api/v1/cart",
        headers: { authorization: `Bearer ${accessToken}` },
        payload: { productId: testProductId, quantity: 1 },
      });

      const checkout = await app.inject({
        method: "POST",
        url: "/api/v1/checkout",
        headers: { authorization: `Bearer ${accessToken}` },
        payload: { shippingAddress: "123 Test St" },
      });
      const { checkoutId } = JSON.parse(checkout.body);

      await app.inject({
        method: "POST",
        url: `/api/v1/orders/confirm/${checkoutId}`,
        headers: { authorization: `Bearer ${accessToken}` },
        payload: { paymentId: `pay_${Date.now()}` },
      });

      const response = await app.inject({
        method: "POST",
        url: `/api/v1/orders/confirm/${checkoutId}`,
        headers: { authorization: `Bearer ${accessToken}` },
        payload: { paymentId: `pay_${Date.now()}` },
      });
      expect(response.statusCode).toBe(400);
    });
  });

  describe("Order cancellation edge cases", () => {
    it("should return 404 for non-existent checkoutId", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/v1/orders/cancel/non-existent-id",
        headers: { authorization: `Bearer ${accessToken}` },
        payload: { reason: "Test" },
      });
      expect(response.statusCode).toBe(404);
    });
  });
});
