import fp from "fastify-plugin";
import swagger from "@fastify/swagger";
import swaggerUI from "@fastify/swagger-ui";
import { env } from "../config/env.js";

async function swaggerPlugin(fastify, _opts) {
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

  await fastify.register(swaggerUI, { routePrefix: "/docs" });
}

export default fp(swaggerPlugin);
