import fastifyModule from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import crypto from "node:crypto";
import { env } from "./config/env.js";

// Services/Helpers
import { setupRateLimiting } from "./services/rateLimiting.js";
import { authMiddleware } from "./services/authMiddleware.js";
import { runMigrations } from "./db/migrate.js";

// Core Plugins
import loggerPlugin from "./plugins/loggingPlugin.js";
import errorHandlerPlugin from "./plugins/errorHandler.js";
import dbPlugin from "./plugins/dbPlugin.js";
import schemaPlugin from "./plugins/schemaPlugin.js";
import servicesPlugin from "./plugins/servicesPlugin.js";
import observabilityPlugin from "./plugins/observabilityPlugin.js";
import swaggerPlugin from "./plugins/swagger.js";

// Domain Modules
import authRoutes from "./modules/auth/auth.routes.js";
import productRoutes from "./modules/products/products.routes.js";
import cartRoutes from "./modules/cart/cart.routes.js";
import orderRoutes from "./modules/orders/orders.routes.js";
import healthRoutes from "./modules/health/health.routes.js";

const fastify = fastifyModule({
  logger: false, // Using custom logger plugin
  genReqId: (req) => req.headers["x-request-id"] || crypto.randomUUID(),
  ajv: {
    customOptions: {
      coerceTypes: true,
      removeAdditional: "all",
      useDefaults: true,
      allErrors: true,
    },
  },
});

const isTest = env.NODE_ENV === "test";
let initialized = false;

/**
 * Enterprise Application Entry Point
 * Modular assembly of plugins and domain-driven routes.
 */
async function initializeApp() {
  if (isTest && initialized) {
    return fastify;
  }

  // 1. Initializations
  await runMigrations();

  // 2. Core Infrastructure (Order Matters: DB -> Schemas -> Services -> Middlewares)
  await fastify.register(dbPlugin);
  await fastify.register(loggerPlugin);
  await fastify.register(errorHandlerPlugin);
  await fastify.register(schemaPlugin);
  await fastify.register(servicesPlugin);
  await fastify.register(observabilityPlugin);
  
  await fastify.register(helmet, { contentSecurityPolicy: false }); 
  await fastify.register(cors, { origin: env.CORS_ORIGIN });
  
  if (!isTest) {
    await setupRateLimiting(fastify);
  }

  // 3. Documentation & Documentation UI
  await fastify.register(swaggerPlugin);

  // 4. Security & Authentication Middleware
  await authMiddleware(fastify);

  // 5. Global System Routes (No versioning)
  await fastify.register(healthRoutes);

  // 6. Domain-Driven Modules (Plug & Play with Versioning)
  const apiV1Prefix = { prefix: "/api/v1" };
  
  await fastify.register(authRoutes, apiV1Prefix);
  await fastify.register(productRoutes, apiV1Prefix);
  await fastify.register(cartRoutes, apiV1Prefix);
  await fastify.register(orderRoutes, apiV1Prefix);

  initialized = true;

  fastify.logger.info("Modular Enterprise Application initialized successfully", {
    environment: env.NODE_ENV,
    version: "2.1.0",
    prefix: "/api/v1",
  });

  return fastify;
}

export { initializeApp, fastify };
