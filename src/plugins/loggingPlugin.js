import fp from "fastify-plugin";
import crypto from "crypto";
import loggerService from "../services/logger.js";

async function loggerPlugin(fastify /*options */) {
  // Decorate fastify with logger service
  fastify.decorate("loggerService", loggerService);
  fastify.decorate("logger", loggerService.getLogger());

  // Add correlation ID to every request
  fastify.addHook("onRequest", async (request, reply) => {
    // Generate or extract correlation ID
    request.correlationId =
      request.headers["x-correlation-id"] || crypto.randomUUID();

    // Set header for response
    reply.header("x-correlation-id", request.correlationId);

    // Store start time
    request.startTime = Date.now();

    // Add correlation ID to child logger
    request.log = request.log.child({
      correlationId: request.correlationId,
      ip: request.ip,
      userAgent: request.headers["user-agent"],
    });

    // Log incoming request
    request.log.info(
      {
        req: {
          method: request.method,
          url: request.url,
          query: request.query,
          params: request.params,
          ip: request.ip,
        },
      },
      "Incoming request",
    );
  });

  // Log after response
  fastify.addHook("onResponse", async (request, reply) => {
    const duration = Date.now() - request.startTime;

    request.log.info(
      {
        res: {
          statusCode: reply.statusCode,
          headers: reply.getHeaders(),
        },
        responseTimeMs: duration,
      },
      "Request completed",
    );

    // Track performance for slow requests
    if (duration > 1000) {
      loggerService.logPerformance(
        request.routeOptions?.url || request.url,
        duration,
        {
          method: request.method,
          statusCode: reply.statusCode,
          userId: request.user?.id,
        },
      );
    }
  });

  // Log business events from hooks
  fastify.addHook("preHandler", async (request /*reply*/) => {
    // Track user authentication
    if (request.user?.id) {
      request.log.debug({ userId: request.user.id }, "Authenticated user");
    }
  });
}

export default fp(loggerPlugin, {
  name: "logger-plugin",
});
