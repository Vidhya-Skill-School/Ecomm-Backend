import { CartController } from "./cart.controller.js";
import {
  cartResponseSchema,
  addToCartSchema,
  updateCartSchema,
} from "./cart.schema.js";
import { STATUS_CODES } from "../../shared/constants.js";

export default async function cartRoutes(fastify, _opts) {
  fastify.addHook("preHandler", fastify.authenticate);

  fastify.get(
    "/cart",
    {
      schema: {
        tags: ["Cart"],
        response: {
          [STATUS_CODES.OK]: cartResponseSchema,
        },
      },
    },
    CartController.getCart,
  );

  fastify.post(
    "/cart",
    {
      schema: {
        tags: ["Cart"],
        body: addToCartSchema,
        response: {
          [STATUS_CODES.OK]: cartResponseSchema,
          [STATUS_CODES.BAD_REQUEST]: { $ref: "ErrorResponse#" },
          [STATUS_CODES.NOT_FOUND]: { $ref: "ErrorResponse#" },

        },
      },
    },
    CartController.addToCart,
  );

  fastify.patch(
    "/cart/:cartId",
    {
      schema: {
        tags: ["Cart"],
        params: {
          type: "object",
          required: ["cartId"],
          properties: { cartId: { type: "number" } },
        },
        body: updateCartSchema,
        response: {
          [STATUS_CODES.OK]: cartResponseSchema,
          [STATUS_CODES.BAD_REQUEST]: { $ref: "ErrorResponse#" },
          [STATUS_CODES.NOT_FOUND]: { $ref: "ErrorResponse#" },

        },
      },
    },
    CartController.updateCartItem,
  );

  fastify.delete(
    "/cart/:cartId",
    {
      schema: {
        tags: ["Cart"],
        params: {
          type: "object",
          required: ["cartId"],
          properties: { cartId: { type: "number" } },
        },
        response: {
          [STATUS_CODES.OK]: cartResponseSchema,
          [STATUS_CODES.NOT_FOUND]: { $ref: "ErrorResponse#" },
        },
      },
    },
    CartController.removeFromCart,
  );

  fastify.delete(
    "/cart",
    {
      schema: {
        tags: ["Cart"],
        response: {
          [STATUS_CODES.OK]: cartResponseSchema,
        },
      },
    },
    CartController.clearCart,
  );
}
