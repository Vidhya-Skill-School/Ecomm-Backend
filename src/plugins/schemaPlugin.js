import fp from "fastify-plugin";

async function schemaPlugin(fastify, _opts) {
  // 1. User Model
  fastify.addSchema({
    $id: "UserModel",
    type: "object",
    properties: {
      id: { type: "integer" },
      email: { type: "string", format: "email" },
      name: { type: "string" },
      phone: { type: "string" },
      isActive: { type: "boolean" },
      createdAt: { type: "string" },
      updatedAt: { type: "string" },
    },
  });

  // 2. Product Model
  fastify.addSchema({
    $id: "ProductModel",
    type: "object",
    properties: {
      id: { type: "integer" },
      title: { type: "string" },
      description: { type: "string" },
      price: { type: "number" },
      category: { type: "string" },
      rating: { type: "number" },
      stock: { type: "integer" },
      brand: { type: "string" },
      createdAt: { type: "string" },
      updatedAt: { type: "string" },
    },
  });

  // 3. Cart Item Model
  fastify.addSchema({
    $id: "CartItemModel",
    type: "object",
    properties: {
      id: { type: "integer" },
      productId: { type: "integer" },
      quantity: { type: "integer" },
      sessionId: { type: "string" },
      addedAt: { type: "string" },
      updatedAt: { type: "string" },
      product: { $ref: "ProductModel#" },
    },
  });

  // 4. Order Model
  fastify.addSchema({
    $id: "OrderModel",
    type: "object",
    properties: {
      id: { type: "integer" },
      orderNumber: { type: "string" },
      sessionId: { type: "string" },
      checkoutId: { type: "string" },
      paymentId: { type: "string" },
      status: { type: "string" },
      totalAmount: { type: "number" },
      items: { type: "string" }, // JSON string or array
      shippingAddress: { type: "string" },
      createdAt: { type: "string" },
      updatedAt: { type: "string" },
    },
  });

  // 5. Standard Error Response
  fastify.addSchema({
    $id: "ErrorResponse",
    type: "object",
    properties: {
      success: { type: "boolean", const: false },
      error: {
        type: "object",
        properties: {
          code: { type: "string" },
          message: { type: "string" },
          details: { type: "object", additionalProperties: true },
        },
      },
      correlationId: { type: "string" },
    },
  });
}

export default fp(schemaPlugin);
