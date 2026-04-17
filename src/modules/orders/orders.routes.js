import { OrderController } from "./orders.controller.js";
import {
  orderSchema,
  checkoutSchema,
  confirmOrderSchema,
  cancelOrderSchema,
  returnOrderSchema,
  checkoutResponseSchema,
  orderTrackResponseSchema,
  orderListResponseSchema,
} from "./orders.schema.js";
import { STATUS_CODES } from "../../shared/constants.js";

export default async function orderRoutes(fastify, _opts) {
  fastify.post(
    "/checkout",
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ["Checkout"],
        body: checkoutSchema,
        response: {
          [STATUS_CODES.OK]: checkoutResponseSchema,
          [STATUS_CODES.BAD_REQUEST]: { $ref: "ErrorResponse#" },
        },
      },
    },
    OrderController.checkout,
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
        response: {
          [STATUS_CODES.OK]: orderSchema,
          [STATUS_CODES.BAD_REQUEST]: { $ref: "ErrorResponse#" },
          [STATUS_CODES.NOT_FOUND]: { $ref: "ErrorResponse#" },
        },
      },
    },
    OrderController.confirm,
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
        response: {
          [STATUS_CODES.OK]: orderSchema,
          [STATUS_CODES.BAD_REQUEST]: { $ref: "ErrorResponse#" },
          [STATUS_CODES.NOT_FOUND]: { $ref: "ErrorResponse#" },
        },
      },
    },
    OrderController.cancel,
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
          properties: { orderId: { type: "string" } },
        },
        response: {
          [STATUS_CODES.OK]: orderSchema,
          [STATUS_CODES.BAD_REQUEST]: { $ref: "ErrorResponse#" },
          [STATUS_CODES.NOT_FOUND]: { $ref: "ErrorResponse#" },
        },
      },
    },
    OrderController.deliver,
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
        response: {
          [STATUS_CODES.OK]: orderTrackResponseSchema,
          [STATUS_CODES.NOT_FOUND]: { $ref: "ErrorResponse#" },
        },
      },
    },
    OrderController.track,
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
          properties: { orderId: { type: "string" } },
        },
        body: returnOrderSchema,
        response: {
          [STATUS_CODES.OK]: orderSchema,
          [STATUS_CODES.BAD_REQUEST]: { $ref: "ErrorResponse#" },
          [STATUS_CODES.NOT_FOUND]: { $ref: "ErrorResponse#" },
        },
      },
    },
    OrderController.return,
  );

  fastify.get(
    "/orders",
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ["Orders"],
        response: {
          [STATUS_CODES.OK]: orderListResponseSchema,
        },
      },
    },
    OrderController.getUserOrders,
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
          properties: { orderId: { type: "string" } },
        },
        response: {
          [STATUS_CODES.OK]: orderSchema,
          [STATUS_CODES.FORBIDDEN]: { $ref: "ErrorResponse#" },
          [STATUS_CODES.NOT_FOUND]: { $ref: "ErrorResponse#" },
        },
      },
    },
    OrderController.getOrderById,
  );
}
