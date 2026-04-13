import { validateAccessToken } from "./session.js";

async function authMiddleware(fastify) {
  fastify.decorate("authenticate", async (request, reply) => {
    try {
      // Get token from Authorization header
      const authHeader = request.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return reply.code(401).send({
          statusCode: 401,
          error: "Unauthorized",
          message: "Missing or invalid authorization token",
        });
      }

      const token = authHeader.substring(7); // Remove 'Bearer ' prefix

      // Validate token from database
      const session = await validateAccessToken(token);
      if (!session) {
        return reply.code(401).send({
          statusCode: 401,
          error: "Unauthorized",
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
      fastify.log.error(error);
      return reply.code(401).send({
        statusCode: 401,
        error: "Unauthorized",
        message: "Authentication failed",
      });
    }
  });
}

export { authMiddleware };
