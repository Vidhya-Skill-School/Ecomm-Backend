import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  build,
  createTestUser,
  getAuthToken,
  createTestProduct,
} from "../helper.js";

describe("Cart - Edge Cases (95% Coverage)", () => {
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
      title: `Cart_Edge_${Date.now()}`,
      price: 49.99,
      stock: 100,
    });
    testProductId = product.id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe("Add to cart edge cases", () => {
    it("should return 404 for non-existent product", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/cart",
        headers: { authorization: `Bearer ${accessToken}` },
        payload: { productId: 999999, quantity: 1 },
      });
      expect(response.statusCode).toBe(404);
    });

    it("should return 400 for quantity zero", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/cart",
        headers: { authorization: `Bearer ${accessToken}` },
        payload: { productId: testProductId, quantity: 0 },
      });
      expect(response.statusCode).toBe(400);
    });

    it("should return 400 for negative quantity", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/cart",
        headers: { authorization: `Bearer ${accessToken}` },
        payload: { productId: testProductId, quantity: -5 },
      });
      expect(response.statusCode).toBe(400);
    });

    it("should return 400 when quantity exceeds stock", async () => {
      const lowStockProduct = await createTestProduct(app, accessToken, {
        title: `Low_Stock_${Date.now()}`,
        price: 29.99,
        stock: 5,
      });

      const response = await app.inject({
        method: "POST",
        url: "/cart",
        headers: { authorization: `Bearer ${accessToken}` },
        payload: { productId: lowStockProduct.id, quantity: 10 },
      });
      expect(response.statusCode).toBe(400);
    });
  });

  describe("Update cart edge cases", () => {
    let cartItemId;

    beforeEach(async () => {
      await app.inject({
        method: "POST",
        url: "/cart",
        headers: { authorization: `Bearer ${accessToken}` },
        payload: { productId: testProductId, quantity: 2 },
      });

      const cart = await app.inject({
        method: "GET",
        url: "/cart",
        headers: { authorization: `Bearer ${accessToken}` },
      });
      const cartBody = JSON.parse(cart.body);
      cartItemId = cartBody.items[0]?.id;
    });

    afterEach(async () => {
      await app.inject({
        method: "DELETE",
        url: "/cart",
        headers: { authorization: `Bearer ${accessToken}` },
      });
    });

    it("should return 404 for non-existent cart item", async () => {
      const response = await app.inject({
        method: "PATCH",
        url: "/cart/999999",
        headers: { authorization: `Bearer ${accessToken}` },
        payload: { quantity: 5 },
      });
      expect(response.statusCode).toBe(404);
    });

    it("should remove item when quantity set to 0", async () => {
      const response = await app.inject({
        method: "PATCH",
        url: `/cart/${cartItemId}`,
        headers: { authorization: `Bearer ${accessToken}` },
        payload: { quantity: 0 },
      });
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.items.length).toBe(0);
    });
  });
});
