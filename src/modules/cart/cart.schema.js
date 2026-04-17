export const cartResponseSchema = {
  type: "object",
  properties: {
    items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "integer" },
          productId: { type: "integer" },
          quantity: { type: "integer" },
          addedAt: { type: "string" },
          title: { type: "string" },
          price: { type: "number" },
          stock: { type: "integer" },
          category: { type: "string" },
          brand: { type: "string" },
          subtotal: { type: "number" },
        },
      },
    },
    total: { type: "number" },
    itemCount: { type: "integer" },
    totalQuantity: { type: "integer" },
  },
};

export const addToCartSchema = {
  type: "object",
  required: ["productId"],
  properties: {
    productId: { type: "integer" },
    quantity: { type: "integer", default: 1, minimum: 1 },
  },
};

export const updateCartSchema = {
  type: "object",
  required: ["quantity"],
  properties: {
    quantity: { type: "integer", minimum: 0 },
  },
};

