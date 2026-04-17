import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { 
  build, 
  createTestUser, 
  createTestProduct,
} from "../helper.js";

describe("Coverage Filling Tests", () => {
  let app;
  let accessToken;
  let refreshToken;
  let testUser;

  beforeAll(async () => {
    app = await build();
    testUser = await createTestUser(app);
    
    // Get both tokens
    const loginRes = await app.inject({
      method: "POST",
      url: "/api/v1/auth/signin",
      payload: {
        email: testUser.user.email,
        password: testUser.password,
      },
    });
    const body = JSON.parse(loginRes.body);
    accessToken = body.accessToken;
    refreshToken = body.refreshToken;
  });

  afterAll(async () => {
    await app.close();
  });

  describe("Auth Module Coverage", () => {
    it("should refresh tokens successfully", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/v1/auth/refresh",
        payload: { refreshToken },
      });
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.accessToken).toBeDefined();
      expect(body.refreshToken).toBeDefined();
    });

    it("should return 401 for invalid refresh token", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/v1/auth/refresh",
        payload: { refreshToken: "invalid_refresh_token" },
      });
      expect(response.statusCode).toBe(401);
    });
  });

  describe("Cart Module Coverage", () => {
    let productId;

    beforeAll(async () => {
      const product = await createTestProduct(app, accessToken);
      productId = product.id;
    });

    it("should update cart item quantity", async () => {
      // First add to cart
      await app.inject({
        method: "POST",
        url: "/api/v1/cart",
        headers: { authorization: `Bearer ${accessToken}` },
        payload: { productId, quantity: 1 }
      });

      const cartRes = await app.inject({
        method: "GET",
        url: "/api/v1/cart",
        headers: { authorization: `Bearer ${accessToken}` }
      });
      const cart = JSON.parse(cartRes.body);
      
      // Ensure we have items
      expect(cart.items.length).toBeGreaterThan(0);
      const cartItemId = cart.items[0].id;

      const response = await app.inject({
        method: "PATCH",
        url: `/api/v1/cart/${cartItemId}`,
        headers: { authorization: `Bearer ${accessToken}` },
        payload: { quantity: 5 }
      });
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.items.some(i => i.id === cartItemId && i.quantity === 5)).toBe(true);
    });

    it("should remove item from cart successfully", async () => {
       // Add item first
       const addRes = await app.inject({
        method: "POST",
        url: "/api/v1/cart",
        headers: { authorization: `Bearer ${accessToken}` },
        payload: { productId, quantity: 1 }
      });
      const cart = JSON.parse(addRes.body);
      const cartItemId = cart.items[0].id;

      const response = await app.inject({
        method: "DELETE",
        url: `/api/v1/cart/${cartItemId}`,
        headers: { authorization: `Bearer ${accessToken}` }
      });
      expect(response.statusCode).toBe(200);
    });

    it("should return 404 for removing non-existent cart item", async () => {
      const response = await app.inject({
        method: "DELETE",
        url: "/api/v1/cart/99999",
        headers: { authorization: `Bearer ${accessToken}` }
      });
      expect(response.statusCode).toBe(404);
    });

    it("should clear the cart", async () => {
      const response = await app.inject({
        method: "DELETE",
        url: "/api/v1/cart",
        headers: { authorization: `Bearer ${accessToken}` }
      });
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.items.length).toBe(0);
    });
  });

  describe("Orders Module Coverage", () => {
    it("should reconcile stock on cancellation", async () => {
      const product = await createTestProduct(app, accessToken, { stock: 10 });
      
      await app.inject({
        method: "POST",
        url: "/api/v1/cart",
        headers: { authorization: `Bearer ${accessToken}` },
        payload: { productId: product.id, quantity: 2 }
      });

      const checkoutRes = await app.inject({
        method: "POST",
        url: "/api/v1/checkout",
        headers: { authorization: `Bearer ${accessToken}` },
        payload: { shippingAddress: "123 Test St", paymentMethod: "card" }
      });
      
      const order = JSON.parse(checkoutRes.body);
      const checkoutId = order.checkoutId;

      await app.inject({
        method: "POST",
        url: `/api/v1/orders/confirm/${checkoutId}`,
        headers: { authorization: `Bearer ${accessToken}` },
        payload: { paymentId: "pay_123" }
      });

      const cancelRes = await app.inject({
        method: "POST",
        url: `/api/v1/orders/cancel/${checkoutId}`,
        headers: { authorization: `Bearer ${accessToken}` },
        payload: {}
      });
      expect(cancelRes.statusCode).toBe(200);

      const productRes = await app.inject({
        method: "GET",
        url: `/api/v1/products/${product.id}`
      });
      const updatedProduct = JSON.parse(productRes.body);
      expect(updatedProduct.stock).toBe(10);
    });

    it("should handle deliver and return logic via Routes", async () => {
      const product = await createTestProduct(app, accessToken, { stock: 10 });

      await app.inject({
        method: "POST",
        url: "/api/v1/cart",
        headers: { authorization: `Bearer ${accessToken}` },
        payload: { productId: product.id, quantity: 1 }
      });

      const checkoutRes = await app.inject({
        method: "POST",
        url: "/api/v1/checkout",
        headers: { authorization: `Bearer ${accessToken}` },
        payload: { shippingAddress: "Route Test Delivery", paymentMethod: "card" }
      });
      const order = JSON.parse(checkoutRes.body);
      const checkoutId = order.checkoutId;
      const orderId = order.orderId;

      await app.inject({
        method: "POST",
        url: `/api/v1/orders/confirm/${checkoutId}`,
        headers: { authorization: `Bearer ${accessToken}` },
        payload: { paymentId: "pay_route_test" }
      });

      // Deliver via Route
      const deliverRes = await app.inject({
        method: "POST",
        url: `/api/v1/orders/deliver/${orderId}`,
        headers: { authorization: `Bearer ${accessToken}` }
      });
      expect(deliverRes.statusCode).toBe(200);
      
      // Return via Route
      const returnRes = await app.inject({
        method: "POST",
        url: `/api/v1/orders/return/${orderId}`,
        headers: { authorization: `Bearer ${accessToken}` },
        payload: { reason: "Route test return" }
      });
      expect(returnRes.statusCode).toBe(200);
    });

    it("should get user orders", async () => {
        const response = await app.inject({
            method: "GET",
            url: "/api/v1/orders",
            headers: { authorization: `Bearer ${accessToken}` }
        });
        expect(response.statusCode).toBe(200);
    });
  });

  describe("Products Module Coverage", () => {
    it("should handle bulk insert and delete via Service", async () => {
      const { productService } = app.server;
      
      await productService.bulkInsertProducts([
        { title: "Bulk 1", description: "D1", price: 10, category: "C1", brand: "B1", rating: 5, stock: 10 },
        { title: "Bulk 2", description: "D2", price: 20, category: "C1", brand: "B1", rating: 5, stock: 10 }
      ]);

      expect(productService.deleteAllProducts).toBeDefined();
      await productService.deleteAllProducts();
    });
  });

  describe("Final Cleanup", () => {
    it("should logout successfully", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/v1/auth/logout",
        headers: { authorization: `Bearer ${accessToken}` },
      });
      expect(response.statusCode).toBe(200);
    });
  });
});
