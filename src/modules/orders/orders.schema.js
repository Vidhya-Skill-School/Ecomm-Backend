export const orderSchema = { $ref: "OrderModel#" };

export const checkoutResponseSchema = {
  type: "object",
  properties: {
    orderId: { type: "integer" },
    orderNumber: { type: "string" },
    checkoutId: { type: "string" },
    totalAmount: { type: "number" },
    items: { type: "array" },
    status: { type: "string" },
  },
};

export const orderTrackResponseSchema = {
  type: "object",
  properties: {
    id: { type: "integer" },
    orderNumber: { type: "string" },
    status: { type: "string" },
    totalAmount: { type: "number" },
    items: { type: "array" },
    shippingAddress: { type: "string" },
    createdAt: { type: "string" },
    updatedAt: { type: "string" },
    paymentId: { type: "string" },
    statusHistory: { type: "array" },
  },
};

export const orderListResponseSchema = {
  type: "array",
  items: { $ref: "OrderModel#" },
};

export const checkoutSchema = {
  type: "object",
  properties: {
    shippingAddress: { type: "string", minLength: 5 },
  },
};

export const confirmOrderSchema = {
  type: "object",
  required: ["paymentId"],
  properties: {
    paymentId: { type: "string", minLength: 1 },
  },
};

export const cancelOrderSchema = {
  type: "object",
  properties: {
    reason: { type: "string", default: "Cancelled by user" },
  },
};

export const returnOrderSchema = {
  type: "object",
  required: ["reason"],
  properties: {
    reason: { type: "string", minLength: 1 },
  },
};

export const orderErrorResponseSchema = { $ref: "ErrorResponse#" };
