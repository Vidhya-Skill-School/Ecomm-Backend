/* ---------------------------------
   SCHEMAS
----------------------------------*/

const productSchema = {
  type: "object",
  properties: {
    id: { type: "number" },
    title: { type: "string" },
    description: { type: "string" },
    price: { type: "number" },
    category: { type: "string" },
    rating: { type: "number" },
    stock: { type: "number" },
    brand: { type: "string" },
    createdAt: { type: "string", format: "date-time" },
    updatedAt: { type: "string", format: "date-time" },
  },
};

const cartItemSchema = {
  type: "object",
  properties: {
    id: { type: "number" },
    productId: { type: "number" },
    quantity: { type: "number" },
    addedAt: { type: "string" },
    title: { type: "string" },
    price: { type: "number" },
    stock: { type: "number" },
    category: { type: "string" },
    brand: { type: "string" },
    subtotal: { type: "number" },
  },
};

const cartResponseSchema = {
  type: "object",
  properties: {
    items: { type: "array", items: cartItemSchema },
    total: { type: "number" },
    itemCount: { type: "number" },
    totalQuantity: { type: "number" },
  },
};

const orderSchema = {
  type: "object",
  properties: {
    id: { type: "number" },
    orderNumber: { type: "string" },
    sessionId: { type: "string" },
    checkoutId: { type: "string" },
    paymentId: { type: "string" },
    status: { type: "string" },
    totalAmount: { type: "number" },
    items: { type: "array" },
    shippingAddress: { type: "string" },
    createdAt: { type: "string" },
    updatedAt: { type: "string" },
  },
};

const productCreateSchema = {
  type: "object",
  additionalProperties: false,
  required: ["title", "description", "price", "category", "brand"],
  properties: {
    title: { type: "string", minLength: 1, maxLength: 255 },
    description: { type: "string", minLength: 1 },
    price: { type: "number", minimum: 0 },
    category: { type: "string", minLength: 1 },
    rating: { type: "number", minimum: 1, maximum: 5 },
    stock: { type: "number", minimum: 0 },
    brand: { type: "string", minLength: 1, maxLength: 255 },
  },
};

const productUpdateSchema = {
  type: "object",
  additionalProperties: false,
  minProperties: 1,
  properties: {
    title: { type: "string", minLength: 1, maxLength: 255 },
    description: { type: "string", minLength: 1 },
    price: { type: "number", minimum: 0 },
    category: { type: "string", minLength: 1 },
    rating: { type: "number", minimum: 1, maximum: 5 },
    stock: { type: "number", minimum: 0 },
    brand: { type: "string", minLength: 1, maxLength: 255 },
  },
};

const productsQuerySchema = {
  type: "object",
  properties: {
    page: { type: "number", default: 1, minimum: 1 },
    limit: { type: "number", default: 10, minimum: 1, maximum: 100 },
    category: { type: "string" },
    minPrice: { type: "number", minimum: 0 },
    maxPrice: { type: "number", minimum: 0 },
    rating: { type: "number", minimum: 1, maximum: 5 },
    search: { type: "string", maxLength: 200 },
    sortBy: {
      type: "string",
      enum: ["id", "title", "price", "rating", "stock", "createdAt"],
      default: "createdAt",
    },
    sortOrder: {
      type: "string",
      enum: ["ASC", "DESC"],
      default: "DESC",
    },
  },
};

// Add after existing schemas

const signupSchema = {
  type: "object",
  required: ["email", "name", "phone", "password"],
  properties: {
    email: { type: "string", format: "email", minLength: 5, maxLength: 255 },
    name: { type: "string", minLength: 2, maxLength: 100 },
    phone: {
      type: "string",
      pattern: "^[0-9]{10}$",
      description: "10 digit mobile number",
    },
    password: {
      type: "string",
      minLength: 6,
      maxLength: 100,
      description: "Minimum 6 characters",
    },
  },
};

const signinSchema = {
  type: "object",
  required: ["email", "password"],
  properties: {
    email: { type: "string", format: "email" },
    password: { type: "string", minLength: 1 },
  },
};

const refreshTokenSchema = {
  type: "object",
  required: ["refreshToken"],
  properties: {
    refreshToken: { type: "string" },
  },
};

const addToCartSchema = {
  type: "object",
  required: ["productId"],
  properties: {
    productId: { type: "number" },
    quantity: { type: "number", default: 1, minimum: 1 },
  },
};

const updateCartSchema = {
  type: "object",
  required: ["quantity"],
  properties: {
    quantity: { type: "number", minimum: 0 },
  },
};

const removeFromCartSchema = {
  type: "object",
  properties: {
    cartId: { type: "number" },
    removeAll: { type: "boolean", default: false },
  },
};

const checkoutSchema = {
  type: "object",
  properties: {
    shippingAddress: { type: "string", minLength: 5 },
  },
};

const confirmOrderSchema = {
  type: "object",
  required: ["paymentId"],
  properties: {
    paymentId: { type: "string", minLength: 1 },
  },
};

const cancelOrderSchema = {
  type: "object",
  properties: {
    reason: { type: "string", default: "Cancelled by user" },
  },
};

const returnOrderSchema = {
  type: "object",
  required: ["reason"],
  properties: {
    reason: { type: "string", minLength: 1 },
  },
};

/* ---------------------------------
   ERROR RESPONSE
----------------------------------*/

const errorResponse = (code) => ({
  [code]: {
    type: "object",
    properties: {
      statusCode: { type: "number" },
      error: { type: "string" },
      message: { type: "string" },
      missingFields: { type: "array", items: { type: "string" } },
      details: {
        type: "array",
        items: {
          type: "object",
          properties: {
            field: { type: "string" },
            issue: { type: "string" },
          },
        },
      },
    },
  },
});

module.exports = {
  productSchema,
  productsQuerySchema,
  signupSchema,
  signinSchema,
  refreshTokenSchema,
  addToCartSchema,
  updateCartSchema,
  removeFromCartSchema,
  checkoutSchema,
  confirmOrderSchema,
  cancelOrderSchema,
  returnOrderSchema,
  errorResponse,
  productCreateSchema,
  productUpdateSchema,
  cartResponseSchema,
  orderSchema,
};
