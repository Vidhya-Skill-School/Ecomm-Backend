import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  vi,
} from "vitest";
import { build, createTestProduct } from "../helper.js";
import * as db from "../../src/db.js";

describe("Products Routes", () => {
  let app;

  beforeAll(async () => {
    app = await build();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /products", () => {
    it("should return paginated products", async () => {
      const mockResponse = {
        total: 2,
        page: 1,
        limit: 10,
        data: [
          createTestProduct({ id: 1 }),
          createTestProduct({ id: 2, title: "Another Product" }),
        ],
      };
      db.getProducts.mockResolvedValue(mockResponse);

      const response = await app.inject({
        method: "GET",
        url: "/products?page=1&limit=10",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty("total");
      expect(body).toHaveProperty("page");
      expect(body).toHaveProperty("limit");
      expect(body).toHaveProperty("data");
      expect(Array.isArray(body.data)).toBe(true);

      // Query params come as strings
      expect(db.getProducts).toHaveBeenCalled();
      const callArg = db.getProducts.mock.calls[0][0];
      expect(callArg.page).toBe("1");
      expect(callArg.limit).toBe("10");
    });

    it("should handle filter parameters", async () => {
      const mockResponse = {
        total: 1,
        page: 1,
        limit: 10,
        data: [createTestProduct({ category: "electronics" })],
      };
      db.getProducts.mockResolvedValue(mockResponse);

      const response = await app.inject({
        method: "GET",
        url: "/products?category=electronics&minPrice=10&maxPrice=100",
      });

      expect(response.statusCode).toBe(200);
      expect(db.getProducts).toHaveBeenCalled();
      const callArg = db.getProducts.mock.calls[0][0];
      expect(callArg.category).toBe("electronics");
      expect(callArg.minPrice).toBe("10");
      expect(callArg.maxPrice).toBe("100");
    });

    it("should handle sort parameters", async () => {
      const mockResponse = {
        total: 2,
        page: 1,
        limit: 10,
        data: [createTestProduct({ id: 1 }), createTestProduct({ id: 2 })],
      };
      db.getProducts.mockResolvedValue(mockResponse);

      const response = await app.inject({
        method: "GET",
        url: "/products?sortBy=price&sortOrder=DESC",
      });

      expect(response.statusCode).toBe(200);
      expect(db.getProducts).toHaveBeenCalled();
      const callArg = db.getProducts.mock.calls[0][0];
      expect(callArg.sortBy).toBe("price");
      expect(callArg.sortOrder).toBe("DESC");
    });
  });

  describe("GET /products/:id", () => {
    it("should return product by ID", async () => {
      const mockProduct = createTestProduct({ id: 1, title: "Test Product" });
      db.getProductById.mockResolvedValue(mockProduct);

      const response = await app.inject({
        method: "GET",
        url: "/products/1",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty("id", 1);
      expect(body).toHaveProperty("title", "Test Product");
      expect(body).toHaveProperty("price");
      expect(db.getProductById).toHaveBeenCalledWith(1);
    });

    it("should return 404 for non-existent product", async () => {
      db.getProductById.mockResolvedValue(null);

      const response = await app.inject({
        method: "GET",
        url: "/products/99999",
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.message).toBe("Product not found");
    });
  });

  describe("POST /products", () => {
    it("should create a new product", async () => {
      const newProduct = {
        title: "New Test Product",
        description: "This is a new test product",
        price: 49.99,
        category: "Test Category",
        brand: "Test Brand",
        rating: 4.5,
        stock: 50,
      };

      const createdProduct = createTestProduct({ id: 2, ...newProduct });
      db.createProduct.mockResolvedValue(createdProduct);

      const response = await app.inject({
        method: "POST",
        url: "/products",
        payload: newProduct,
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.message).toBe("Product created successfully");
      expect(body.data).toHaveProperty("id");
      expect(body.data.title).toBe(newProduct.title);
      expect(db.createProduct).toHaveBeenCalledWith(newProduct);
    });

    it("should return 400 for missing required fields", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/products",
        payload: {
          title: "Incomplete Product",
          // Missing description, price, category, brand
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toBe("Validation Error");
    });

    it("should return 400 for invalid price", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/products",
        payload: {
          title: "Test Product",
          description: "Description",
          price: -10, // Invalid negative price
          category: "Test",
          brand: "Test Brand",
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toBe("Validation Error");
    });
  });

  describe("PATCH /products/:id", () => {
    it("should update product partially", async () => {
      const updatedProduct = createTestProduct({
        id: 1,
        price: 149.99,
        stock: 25,
      });
      db.updateProduct.mockResolvedValue(updatedProduct);

      const response = await app.inject({
        method: "PATCH",
        url: "/products/1",
        payload: {
          price: 149.99,
          stock: 25,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.message).toBe("Product updated successfully");
      expect(body.data.price).toBe(149.99);
      expect(body.data.stock).toBe(25);
      expect(db.updateProduct).toHaveBeenCalledWith(1, {
        price: 149.99,
        stock: 25,
      });
    });

    it("should return 404 for non-existent product", async () => {
      db.updateProduct.mockResolvedValue(null);

      const response = await app.inject({
        method: "PATCH",
        url: "/products/99999",
        payload: { price: 100 },
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.message).toBe("Product not found");
    });
  });

  describe("DELETE /products/:id", () => {
    it("should delete a product", async () => {
      const deletedProduct = createTestProduct({ id: 1 });
      db.deleteProduct.mockResolvedValue(deletedProduct);

      const response = await app.inject({
        method: "DELETE",
        url: "/products/1",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.message).toBe("Product deleted successfully");
      expect(db.deleteProduct).toHaveBeenCalledWith(1);
    });

    it("should return 404 for non-existent product", async () => {
      db.deleteProduct.mockResolvedValue(null);

      const response = await app.inject({
        method: "DELETE",
        url: "/products/99999",
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.message).toBe("Product not found");
    });
  });
});
