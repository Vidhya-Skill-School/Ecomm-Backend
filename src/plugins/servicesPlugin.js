import fp from "fastify-plugin";
import { AuthService } from "../modules/auth/auth.service.js";
import { ProductService } from "../modules/products/products.service.js";
import { CartService } from "../modules/cart/cart.service.js";
import { OrderService } from "../modules/orders/orders.service.js";

async function servicesPlugin(fastify, _opts) {
  // 1. Dependency Injection - Instantiate classes with dependencies
  const productService = new ProductService(fastify.db);
  const authService = new AuthService(fastify.db);
  const cartService = new CartService(fastify.db, productService);
  const orderService = new OrderService(fastify.db, cartService, productService);

  // 2. Decorate fastify with services
  fastify.decorate("authService", authService);
  fastify.decorate("productService", productService);
  fastify.decorate("cartService", cartService);
  fastify.decorate("orderService", orderService);

  // 3. Add Transaction Helper
  fastify.decorate("transaction", async (handler) => {
    // LibSQL built-in transaction support
    const tx = await fastify.db.transaction("write");
    try {
      const result = await handler(tx);
      await tx.commit();
      return result;
    } catch (err) {
      await tx.rollback();
      throw err;
    }
  });
}

export default fp(servicesPlugin);
