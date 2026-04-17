import fastifyModule from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import crypto from "node:crypto";
import { env } from "./config/env.js";

import compress from "@fastify/compress";

import swagger from "@fastify/swagger";
import swaggerUI from "@fastify/swagger-ui";
import { readFileSync } from "node:fs";
import { join } from "node:path";

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

// Domain Modules
import authRoutes from "./modules/auth/auth.routes.js";
import productRoutes from "./modules/products/products.routes.js";
import cartRoutes from "./modules/cart/cart.routes.js";
import orderRoutes from "./modules/orders/orders.routes.js";
import healthRoutes from "./modules/health/health.routes.js";

const fastify = fastifyModule({
  logger: false, // Using custom logger plugin
  routerOptions: {
    ignoreTrailingSlash: true,
  },
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
  await fastify.register(compress, { global: true });

  // 2. Global Security & Infrastructure (Register FIRST to avoid route interference)
  await fastify.register(dbPlugin);
  await fastify.register(loggerPlugin);

  await fastify.register(helmet, { contentSecurityPolicy: false });
  await fastify.register(cors, { origin: env.CORS_ORIGIN });

  if (!isTest) {
    await setupRateLimiting(fastify);
  }

  // 3. Documentation & Documentation UI
  await fastify.register(swagger, {
    openapi: {
      info: {
        title: "Ecommerce Product API",
        description: "Complete e-commerce API with cart, orders, and payment workflow",
        version: "2.1.0",
      },
      tags: [
        { name: "Authentication" },
        { name: "Products" },
        { name: "Cart" },
        { name: "Orders" },
        { name: "Checkout" },
        { name: "Statistics" },
      ],
      servers: [{ url: `http://localhost:${env.PORT}` }],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "JWT",
          },
        },
      },
    },
  });

  await fastify.register(swaggerUI, {
    routePrefix: "/docs",
    uiConfig: {
      docExpansion: "list",
      deepLinking: false,
    },
  });

  // Explicit static asset routes for Swagger UI
  // @fastify/static's wildcard is not matched in Fastify 5 with our custom 404 handler,
  // so we serve each file explicitly — same pattern as the working swagger-initializer.js route.
  const swaggerStaticDir = join("/app/node_modules/@fastify/swagger-ui", "static");
  const swaggerAssets = [
    { file: "swagger-ui.css", mime: "text/css; charset=UTF-8" },
    { file: "index.css", mime: "text/css; charset=UTF-8" },
    { file: "swagger-ui-bundle.js", mime: "application/javascript; charset=UTF-8" },
    { file: "swagger-ui-standalone-preset.js", mime: "application/javascript; charset=UTF-8" },
    { file: "swagger-ui.js", mime: "application/javascript; charset=UTF-8" },
    { file: "favicon-32x32.png", mime: "image/png" },
    { file: "favicon-16x16.png", mime: "image/png" },
    { file: "logo.svg", mime: "image/svg+xml" },
  ];

  for (const { file, mime } of swaggerAssets) {
    const content = readFileSync(join(swaggerStaticDir, file));
    fastify.get(`/docs/static/${file}`, { schema: { hide: true } }, (_req, reply) => {
      reply.header("content-type", mime).send(content);
    });
  }

  await fastify.register(schemaPlugin);
  await fastify.register(servicesPlugin);
  await fastify.register(observabilityPlugin);

  // 4. Security & Authentication Middleware
  await authMiddleware(fastify);

  // 5. Global Error & 404 Handling (Register Early to cover all routes)
  await fastify.register(errorHandlerPlugin);

  // 6. Global System Routes (No versioning)
  await fastify.register(healthRoutes);

  // 7. Domain-Driven Modules (Plug & Play with Versioning)
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
