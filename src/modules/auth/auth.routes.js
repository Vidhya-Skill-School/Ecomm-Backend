import { AuthController } from "./auth.controller.js";
import {
  signupSchema,
  signinSchema,
  refreshTokenSchema,
  accountResponseSchema,
  signupResponseSchema,
  signinResponseSchema,
  refreshResponseSchema,
  logoutResponseSchema,
  authErrorResponseSchema,
} from "./auth.schema.js";
import { STATUS_CODES } from "../../shared/constants.js";

export default async function authRoutes(fastify, _opts) {
  fastify.get(
    "/account",
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ["Authentication"],
        summary: "Get user account details",
        security: [{ bearerAuth: [] }],
        response: {
          [STATUS_CODES.OK]: accountResponseSchema,
          [STATUS_CODES.UNAUTHORIZED]: authErrorResponseSchema,
          [STATUS_CODES.NOT_FOUND]: authErrorResponseSchema,
        },
      },
    },
    AuthController.getAccount,
  );

  fastify.post(
    "/auth/signup",
    {
      schema: {
        tags: ["Authentication"],
        body: signupSchema,
        response: {
          [STATUS_CODES.CREATED]: signupResponseSchema,
          [STATUS_CODES.BAD_REQUEST]: authErrorResponseSchema,
          [STATUS_CODES.CONFLICT]: authErrorResponseSchema,
        },
      },
    },
    AuthController.signup,
  );

  fastify.post(
    "/auth/signin",
    {
      schema: {
        tags: ["Authentication"],
        body: signinSchema,
        response: {
          [STATUS_CODES.OK]: signinResponseSchema,
          [STATUS_CODES.UNAUTHORIZED]: authErrorResponseSchema,
        },
      },
    },
    AuthController.signin,
  );

  fastify.post(
    "/auth/refresh",
    {
      schema: {
        tags: ["Authentication"],
        body: refreshTokenSchema,
        response: {
          [STATUS_CODES.OK]: refreshResponseSchema,
          [STATUS_CODES.UNAUTHORIZED]: authErrorResponseSchema,
        },
      },
    },
    AuthController.refresh,
  );

  fastify.post(
    "/auth/logout",
    {
      schema: {
        tags: ["Authentication"],
        response: {
          [STATUS_CODES.OK]: logoutResponseSchema,
        },
      },
    },
    AuthController.logout,
  );
}
