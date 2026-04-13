import fastifyModule from "fastify";
import cors from "@fastify/cors";
import swagger from "@fastify/swagger";
import swaggerUI from "@fastify/swagger-ui";

import {
  generateAccessToken,
  generateRefreshToken,
  hashPassword,
  verifyPassword,
} from "./services/jwt.js";

import {
  createSession,
  validateRefreshToken,
  updateSessionTokens,
  invalidateSession,
  // invalidateAllUserSessions,
  getUserByEmail,
  getUserById,
  createUser,
} from "./services/session.js";

import { setupRateLimiting } from "./services/rateLimiting.js";
import { authMiddleware } from "./services/authMiddleware.js";

import {
  initializeDatabase,
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getCategories,
  getStatistics,
  addToCart,
  getCart,
  updateCartItem,
  removeFromCart,
  clearCart,
  createCheckout,
  confirmOrder,
  cancelOrder,
  deliverOrder,
  trackOrder,
  returnOrder,
  getUserOrders,
  getOrderById,
} from "./db.js";

import {
  productSchema,
  productCreateSchema,
  productUpdateSchema,
  productsQuerySchema,
  signupSchema,
  signinSchema,
  refreshTokenSchema,
  addToCartSchema,
  updateCartSchema,
  cartResponseSchema,
  checkoutSchema,
  confirmOrderSchema,
  cancelOrderSchema,
  returnOrderSchema,
} from "./schema.js";

const fastify = fastifyModule({
  logger: true,
  ajv: {
    customOptions: {
      coerceTypes: "array",
      removeAdditional: "all",
      useDefaults: true,
      allErrors: true,
    },
  },
});

// Track initialization to prevent multiple initializations in test environment
const isTest = process.env.NODE_ENV === "test";
let initialized = false;

function registerErrorHandlers() {
  fastify.setErrorHandler((error, req, reply) => {
    const statusCode = error.statusCode || 500;

    if (error.validation) {
      const missingFields = error.validation
        .filter((v) => v.keyword === "required")
        .map((v) => v.params.missingProperty);

      const otherErrors = error.validation
        .filter((v) => v.keyword !== "required")
        .map((v) => ({
          field: v.instancePath.replace(/^\//, "") || "unknown",
          issue: v.message,
        }));

      const formatFieldList = (fields) => {
        if (fields.length === 0) return "";
        if (fields.length === 1) return fields[0];
        const last = fields[fields.length - 1];
        const rest = fields.slice(0, -1);
        return `${rest.join(", ")} & ${last}`;
      };

      const message =
        missingFields.length > 0
          ? `Please provide ${formatFieldList(missingFields)} field${missingFields.length > 1 ? "s" : ""}.`
          : `Invalid value${otherErrors.length > 1 ? "s" : ""} for: ${formatFieldList(otherErrors.map((e) => e.field))}.`;

      return reply.status(400).send({
        statusCode: 400,
        error: "Validation Error",
        message,
        ...(missingFields.length > 0 && { missingFields }),
        ...(otherErrors.length > 0 && { details: otherErrors }),
      });
    }

    if (
      error.message === "Product not found" ||
      error.message === "Cart item not found" ||
      error.message === "Order not found"
    ) {
      return reply.status(404).send({
        statusCode: 404,
        error: "Not Found",
        message: error.message,
      });
    }

    if (error.message.includes("Insufficient stock")) {
      return reply.status(400).send({
        statusCode: 400,
        error: "Bad Request",
        message: error.message,
      });
    }

    fastify.log.error(error);

    reply.status(statusCode).send({
      statusCode,
      error:
        statusCode === 500 ? "Internal Server Error" : error.name || "Error",
      message:
        statusCode === 500
          ? "An unexpected error occurred. Please try again later."
          : error.message,
    });
  });

  fastify.setNotFoundHandler((req, reply) => {
    reply.status(404).send({
      statusCode: 404,
      error: "Not Found",
      message: `Route ${req.method} ${req.url} not found`,
    });
  });
}

async function registerPlugins() {
  await fastify.register(cors, { origin: "*" });

  // Skip rate limiting in test environment
  if (!isTest) {
    await setupRateLimiting(fastify);
  }

  await fastify.register(swagger, {
    openapi: {
      info: {
        title: "Ecommerce Product API",
        description:
          "Complete e-commerce API with cart, orders, and payment workflow",
        version: "2.0.0",
      },
      tags: [
        { name: "Authentication" },
        { name: "Products" },
        { name: "Cart" },
        { name: "Orders" },
        { name: "Checkout" },
        { name: "Statistics" },
      ],
      servers: [{ url: "http://localhost:3001" }],
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
  await fastify.register(swaggerUI, { routePrefix: "/docs" });
  await authMiddleware(fastify);
}

function registerRoutes() {
  // Auth Routes
  fastify.get(
    "/account",
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ["Authentication"],
        summary: "Get user account details",
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            type: "object",
            properties: {
              id: { type: "number" },
              email: { type: "string" },
              name: { type: "string" },
              phone: { type: "string" },
            },
          },
        },
      },
    },
    async (req, reply) => {
      const userId = req.user.id;
      const user = await getUserById(userId);
      if (!user) return reply.code(404).send({ message: "User not found" });
      return reply.code(200).send(user);
    },
  );

  fastify.post(
    "/auth/signup",
    {
      schema: {
        tags: ["Authentication"],
        body: signupSchema,
        response: {
          201: {
            type: "object",
            properties: {
              message: { type: "string" },
              user: {
                type: "object",
                properties: {
                  id: { type: "number" },
                  email: { type: "string" },
                  name: { type: "string" },
                  phone: { type: "string" },
                },
              },
            },
          },
        },
      },
    },
    async (req, reply) => {
      const { email, name, phone, password } = req.body;
      const existingUser = await getUserByEmail(email);
      if (existingUser) {
        return reply.code(409).send({
          statusCode: 409,
          error: "Conflict",
          message: "User with this email already exists",
        });
      }
      const hashedPassword = hashPassword(password);
      const userId = await createUser(email, name, phone, hashedPassword);
      const user = await getUserById(userId);
      return reply
        .code(201)
        .send({ message: "User registered successfully", user });
    },
  );

  fastify.post(
    "/auth/signin",
    {
      schema: {
        tags: ["Authentication"],
        body: signinSchema,
        response: {
          200: {
            type: "object",
            properties: {
              message: { type: "string" },
              accessToken: { type: "string" },
              refreshToken: { type: "string" },
              user: {
                type: "object",
                properties: {
                  id: { type: "number" },
                  email: { type: "string" },
                  name: { type: "string" },
                },
              },
            },
          },
        },
      },
    },
    async (req, reply) => {
      const { email, password } = req.body;
      const user = await getUserByEmail(email);
      if (!user || !verifyPassword(password, user.password)) {
        return reply.code(401).send({
          statusCode: 401,
          error: "Unauthorized",
          message: "Invalid email or password",
        });
      }
      const accessToken = generateAccessToken(user.id, user.email);
      const refreshToken = generateRefreshToken(user.id, user.email);
      await createSession(
        user.id,
        accessToken,
        refreshToken,
        req.headers["user-agent"] || "unknown",
        req.ip,
      );
      return reply.code(200).send({
        message: "Login successful",
        accessToken,
        refreshToken,
        user: { id: user.id, email: user.email, name: user.name },
      });
    },
  );

  fastify.post(
    "/auth/refresh",
    {
      schema: {
        tags: ["Authentication"],
        body: refreshTokenSchema,
      },
    },
    async (req, reply) => {
      const { refreshToken } = req.body;
      const session = await validateRefreshToken(refreshToken);
      if (!session) {
        return reply.code(401).send({
          statusCode: 401,
          error: "Unauthorized",
          message: "Invalid or expired refresh token",
        });
      }
      const newAccessToken = generateAccessToken(session.userId, session.email);
      const newRefreshToken = generateRefreshToken(
        session.userId,
        session.email,
      );
      await updateSessionTokens(refreshToken, newAccessToken, newRefreshToken);
      return reply
        .code(200)
        .send({ accessToken: newAccessToken, refreshToken: newRefreshToken });
    },
  );

  fastify.post(
    "/auth/logout",
    {
      schema: {
        tags: ["Authentication"],
        headers: {
          type: "object",
          required: ["authorization"],
          properties: {
            authorization: { type: "string" },
          },
        },
      },
    },
    async (req, reply) => {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith("Bearer ")) {
        await invalidateSession(authHeader.substring(7));
      }
      return reply.code(200).send({ message: "Logged out successfully" });
    },
  );

  // Products Routes
  fastify.get(
    "/products",
    {
      schema: {
        tags: ["Products"],
        querystring: productsQuerySchema,
        response: {
          200: {
            type: "object",
            properties: {
              total: { type: "number" },
              page: { type: "number" },
              limit: { type: "number" },
              data: { type: "array", items: productSchema },
            },
          },
        },
      },
    },
    async (req) => getProducts(req.query),
  );

  fastify.get(
    "/products/:id",
    {
      schema: {
        tags: ["Products"],
        params: {
          type: "object",
          required: ["id"],
          properties: { id: { type: "number" } },
        },
        response: { 200: productSchema },
      },
    },
    async (req, reply) => {
      const product = await getProductById(parseInt(req.params.id));
      if (!product)
        return reply.code(404).send({ message: "Product not found" });
      return product;
    },
  );

  fastify.post(
    "/products",
    {
      schema: {
        tags: ["Products"],
        body: productCreateSchema,
        response: {
          201: {
            type: "object",
            properties: {
              message: { type: "string" },
              data: productSchema,
            },
          },
        },
      },
    },
    async (req, reply) => {
      const newProduct = await createProduct(req.body);
      return reply
        .code(201)
        .send({ message: "Product created successfully", data: newProduct });
    },
  );

  fastify.patch(
    "/products/:id",
    {
      schema: {
        tags: ["Products"],
        params: {
          type: "object",
          required: ["id"],
          properties: { id: { type: "number" } },
        },
        body: productUpdateSchema,
      },
    },
    async (req, reply) => {
      const updated = await updateProduct(parseInt(req.params.id), req.body);
      if (!updated)
        return reply.code(404).send({ message: "Product not found" });
      return reply
        .code(200)
        .send({ message: "Product updated successfully", data: updated });
    },
  );

  fastify.delete(
    "/products/:id",
    {
      schema: {
        tags: ["Products"],
        params: {
          type: "object",
          required: ["id"],
          properties: { id: { type: "number" } },
        },
      },
    },
    async (req, reply) => {
      const deleted = await deleteProduct(parseInt(req.params.id));
      if (!deleted)
        return reply.code(404).send({ message: "Product not found" });
      return reply
        .code(200)
        .send({ message: "Product deleted successfully", data: deleted });
    },
  );

  // Cart Routes
  fastify.post(
    "/cart",
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ["Cart"],
        body: addToCartSchema,
        response: { 200: cartResponseSchema },
      },
    },
    async (req, reply) => {
      const userId = req.user.id.toString();
      const { productId, quantity = 1 } = req.body;
      const cart = await addToCart(userId, productId, quantity);
      return reply.code(200).send(cart);
    },
  );

  fastify.get(
    "/cart",
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ["Cart"],
        response: { 200: cartResponseSchema },
      },
    },
    async (req) => {
      const userId = req.user.id.toString();
      return getCart(userId);
    },
  );

  fastify.patch(
    "/cart/:cartId",
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ["Cart"],
        params: {
          type: "object",
          required: ["cartId"],
          properties: { cartId: { type: "number" } },
        },
        body: updateCartSchema,
      },
    },
    async (req, reply) => {
      const userId = req.user.id.toString();
      const cart = await updateCartItem(
        userId,
        parseInt(req.params.cartId),
        req.body.quantity,
      );
      return reply.code(200).send(cart);
    },
  );

  fastify.delete(
    "/cart/:cartId",
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ["Cart"],
        params: {
          type: "object",
          required: ["cartId"],
          properties: { cartId: { type: "number" } },
        },
      },
    },
    async (req, reply) => {
      const userId = req.user.id.toString();
      const cart = await removeFromCart(
        userId,
        parseInt(req.params.cartId),
        false,
      );
      return reply.code(200).send(cart);
    },
  );

  fastify.delete(
    "/cart",
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ["Cart"],
      },
    },
    async (req, reply) => {
      const userId = req.user.id.toString();
      const cart = await clearCart(userId);
      return reply.code(200).send(cart);
    },
  );

  // Order Routes
  fastify.post(
    "/checkout",
    {
      preHandler: [fastify.authenticate],
      schema: { body: checkoutSchema, tags: ["Checkout"] },
    },
    async (req, reply) => {
      const userId = req.user.id.toString();
      const { shippingAddress = null } = req.body;
      const checkout = await createCheckout(userId, shippingAddress);
      return reply.code(200).send(checkout);
    },
  );

  fastify.post(
    "/orders/confirm/:checkoutId",
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ["Orders"],
        params: {
          type: "object",
          required: ["checkoutId"],
          properties: { checkoutId: { type: "string" } },
        },
        body: confirmOrderSchema,
      },
    },
    async (req, reply) => {
      const { checkoutId } = req.params;
      const { paymentId } = req.body;
      const order = await confirmOrder(checkoutId, paymentId);
      return reply.code(200).send(order);
    },
  );

  fastify.post(
    "/orders/cancel/:checkoutId",
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ["Orders"],
        params: {
          type: "object",
          required: ["checkoutId"],
          properties: { checkoutId: { type: "string" } },
        },
        body: cancelOrderSchema,
      },
    },
    async (req, reply) => {
      const { checkoutId } = req.params;
      const { reason = "Cancelled by user" } = req.body;
      const order = await cancelOrder(checkoutId, reason);
      return reply.code(200).send(order);
    },
  );

  fastify.post(
    "/orders/deliver/:orderId",
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ["Orders"],
        params: {
          type: "object",
          required: ["orderId"],
          properties: { orderId: { type: "number" } },
        },
      },
    },
    async (req, reply) => {
      const order = await deliverOrder(parseInt(req.params.orderId));
      return reply.code(200).send(order);
    },
  );

  fastify.get(
    "/orders/track/:orderNumber",
    {
      schema: {
        tags: ["Orders"],
        params: {
          type: "object",
          required: ["orderNumber"],
          properties: { orderNumber: { type: "string" } },
        },
      },
    },
    async (req, reply) => {
      const order = await trackOrder(req.params.orderNumber);
      return reply.code(200).send(order);
    },
  );

  fastify.post(
    "/orders/return/:orderId",
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ["Orders"],
        params: {
          type: "object",
          required: ["orderId"],
          properties: { orderId: { type: "number" } },
        },
        body: returnOrderSchema,
      },
    },
    async (req, reply) => {
      const order = await returnOrder(
        parseInt(req.params.orderId),
        req.body.reason,
      );
      return reply.code(200).send(order);
    },
  );

  fastify.get(
    "/orders",
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ["Orders"],
      },
    },
    async (req) => {
      const userId = req.user.id.toString();
      return getUserOrders(userId);
    },
  );

  fastify.get(
    "/orders/:orderId",
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ["Orders"],
        params: {
          type: "object",
          required: ["orderId"],
          properties: { orderId: { type: "number" } },
        },
      },
    },
    async (req, reply) => {
      const order = await getOrderById(parseInt(req.params.orderId));
      if (!order) return reply.code(404).send({ message: "Order not found" });
      const userId = req.user.id.toString();
      if (order.sessionId !== userId) {
        return reply.code(403).send({ message: "Access denied" });
      }
      return reply.code(200).send(order);
    },
  );

  // Statistics Routes
  fastify.get("/categories", { schema: { tags: ["Products"] } }, async () =>
    getCategories(),
  );
  fastify.get("/statistics", { schema: { tags: ["Products"] } }, async () =>
    getStatistics(),
  );
  // fastify.get("/health", { schema: { tags: ["Statistics"] } }, async () => ({
  //   status: "ok",
  //   timestamp: new Date().toISOString(),
  // }));
}

async function initializeApp() {
  // Prevent multiple initializations in test environment
  if (isTest && initialized) {
    return fastify;
  }

  // Initialize database only once
  initializeDatabase();

  registerErrorHandlers();
  await registerPlugins();
  registerRoutes();

  initialized = true;
  return fastify;
}

export { initializeApp, fastify };
