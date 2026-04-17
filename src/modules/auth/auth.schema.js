export const signupSchema = {
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

export const signinSchema = {
  type: "object",
  required: ["email", "password"],
  properties: {
    email: { type: "string", format: "email" },
    password: { type: "string", minLength: 1 },
  },
};

export const refreshTokenSchema = {
  type: "object",
  required: ["refreshToken"],
  properties: {
    refreshToken: { type: "string" },
  },
};

export const accountResponseSchema = { $ref: "UserModel#" };

export const signupResponseSchema = {
  type: "object",
  properties: {
    message: { type: "string" },
    data: { $ref: "UserModel#" },
  },
};

export const signinResponseSchema = {
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
};

export const refreshResponseSchema = {
  type: "object",
  properties: {
    accessToken: { type: "string" },
    refreshToken: { type: "string" },
  },
};

export const logoutResponseSchema = {
  type: "object",
  properties: {
    message: { type: "string" },
  },
};

export const authErrorResponseSchema = {
  type: "object",
  properties: {
    success: { type: "boolean" },
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
};
