import { ProductController } from "./products.controller.js";
import {
  productSchema,
  productCreateSchema,
  productUpdateSchema,
  productsQuerySchema,
  productsListResponseSchema,
  productActionResponseSchema,
  categoriesResponseSchema,
  statisticsResponseSchema,
} from "./products.schema.js";
import { STATUS_CODES } from "../../shared/constants.js";

export default async function productRoutes(fastify, _opts) {
  fastify.get(
    "/products",
    {
      schema: {
        tags: ["Products"],
        querystring: productsQuerySchema,
        response: {
          [STATUS_CODES.OK]: productsListResponseSchema,
        },
      },
    },
    ProductController.getProducts,
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
        response: {
          [STATUS_CODES.OK]: productSchema,
          [STATUS_CODES.BAD_REQUEST]: { $ref: "ErrorResponse#" },
          [STATUS_CODES.NOT_FOUND]: { $ref: "ErrorResponse#" },
        },
      },
    },
    ProductController.getProductById,
  );

  fastify.post(
    "/products",
    {
      schema: {
        tags: ["Products"],
        body: productCreateSchema,
        response: {
          [STATUS_CODES.CREATED]: productActionResponseSchema,
          [STATUS_CODES.BAD_REQUEST]: { $ref: "ErrorResponse#" },
        },
      },
    },
    ProductController.createProduct,
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
        response: {
          [STATUS_CODES.OK]: productActionResponseSchema,
          [STATUS_CODES.BAD_REQUEST]: { $ref: "ErrorResponse#" },
          [STATUS_CODES.NOT_FOUND]: { $ref: "ErrorResponse#" },
        },
      },
    },
    ProductController.updateProduct,
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
        response: {
          [STATUS_CODES.OK]: productActionResponseSchema,
          [STATUS_CODES.BAD_REQUEST]: { $ref: "ErrorResponse#" },
          [STATUS_CODES.NOT_FOUND]: { $ref: "ErrorResponse#" },
        },
      },
    },
    ProductController.deleteProduct,
  );

  fastify.get(
    "/categories",
    {
      schema: {
        tags: ["Products"],
        response: {
          [STATUS_CODES.OK]: categoriesResponseSchema,
        },
      },
    },
    ProductController.getCategories,
  );

  fastify.get(
    "/statistics",
    {
      schema: {
        tags: ["Products"],
        response: {
          [STATUS_CODES.OK]: statisticsResponseSchema,
        },
      },
    },
    ProductController.getStatistics,
  );
}
