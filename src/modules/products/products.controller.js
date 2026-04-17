import loggerService from "../../services/logger.js";
import { STATUS_CODES } from "../../shared/constants.js";

export const ProductController = {
  /**
   * Get products with filtering and pagination
   */
  async getProducts(req) {
    const startTime = Date.now();
    const result = await req.server.productService.getProducts(req.query);

    loggerService.logPerformance("GET /products", Date.now() - startTime, {
      filters: req.query,
      resultCount: result.data.length,
      total: result.total,
    });

    return result;
  },

  async getProductById(req) {
    const product = await req.server.productService.getProductById(parseInt(req.params.id));
    
    // Error handling moved to Service + Global Error Handler
    if (!product) {
      // Manual check if not thrown by service (ProductService.getProductById currently returns null)
      // Actually ProductService.getProductById is used by other services, so it returns null.
      // But we can throw here if we want consistent 404s.
      const { NotFoundError } = await import("../../shared/errors.js");
      throw new NotFoundError("Product");
    }
    
    return product;
  },

  async createProduct(req, reply) {
    const newProduct = await req.server.productService.createProduct(req.body);

    loggerService.logBusinessEvent(
      "product_created",
      { productId: newProduct.id, ...req.body },
      req.user?.id,
      req.correlationId,
    );

    return reply
      .code(STATUS_CODES.CREATED)
      .send({ message: "Product created successfully", data: newProduct });
  },

  async updateProduct(req, reply) {
    // Service now throws NotFoundError if not exists
    const updated = await req.server.productService.updateProduct(parseInt(req.params.id), req.body);

    loggerService.logBusinessEvent(
      "product_updated",
      { productId: parseInt(req.params.id), updates: req.body },
      req.user?.id,
      req.correlationId,
    );

    return reply
      .code(STATUS_CODES.OK)
      .send({ message: "Product updated successfully", data: updated });
  },

  async deleteProduct(req, reply) {
    // Service now throws NotFoundError if not exists
    const deleted = await req.server.productService.deleteProduct(parseInt(req.params.id));

    loggerService.logBusinessEvent(
      "product_deleted",
      { productId: parseInt(req.params.id), product: deleted },
      req.user?.id,
      req.correlationId,
    );

    return reply
      .code(STATUS_CODES.OK)
      .send({ message: "Product deleted successfully", data: deleted });
  },

  async getCategories(req) {
    return req.server.productService.getCategories();
  },

  async getStatistics(req) {
    return req.server.productService.getStatistics();
  },
};
