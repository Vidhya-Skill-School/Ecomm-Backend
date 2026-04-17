export const productSchema = { $ref: "ProductModel#" };

export const productCreateSchema = {
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

export const productUpdateSchema = {
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

export const productsQuerySchema = {
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

export const productsListResponseSchema = {
  type: "object",
  properties: {
    total: { type: "number" },
    page: { type: "number" },
    limit: { type: "number" },
    data: { type: "array", items: { $ref: "ProductModel#" } },
  },
};

export const productActionResponseSchema = {
  type: "object",
  properties: {
    message: { type: "string" },
    data: { $ref: "ProductModel#" },
  },
};

export const categoriesResponseSchema = {
  type: "array",
  items: { type: "string" },
};

export const statisticsResponseSchema = {
  type: "object",
  properties: {
    totalProducts: { type: "number" },
    totalCategories: { type: "number" },
    totalBrands: { type: "number" },
    avgPrice: { type: "number" },
    minPrice: { type: "number" },
    maxPrice: { type: "number" },
    avgRating: { type: "number" },
    totalStock: { type: "number" },
  },
};

