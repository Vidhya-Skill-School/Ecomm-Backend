import { STATUS_CODES } from "../shared/constants.js";

async function authMiddleware(fastify) {
  fastify.decorate("authenticate", async (request, reply) => {
    try {
      const authHeader = request.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return reply.code(STATUS_CODES.UNAUTHORIZED).send({
          code: "UNAUTHORIZED",
          message: "Missing or invalid authorization token",
        });
      }

      const token = authHeader.substring(7);

      // Use the decorated authService from the Fastify server instance
      const session = await request.server.authService.validateAccessToken(token);
      
      if (!session) {
        return reply.code(STATUS_CODES.UNAUTHORIZED).send({
          code: "UNAUTHORIZED",
          message: "Invalid or expired token",
        });
      }

      // Attach user info to request
      request.user = {
        id: session.userId,
        email: session.email,
        name: session.name,
      };
      request.userId = session.userId;
      request.accessToken = token;
    } catch (error) {
      request.log.error(error, "Authentication middleware error");
      return reply.code(STATUS_CODES.UNAUTHORIZED).send({
        code: "UNAUTHORIZED",
        message: "Authentication failed",
      });
    }
  });
}

export { authMiddleware };
