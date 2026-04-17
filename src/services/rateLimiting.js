import rateLimit from "@fastify/rate-limit";
import { env } from "../config/env.js";
import { STATUS_CODES } from "../shared/constants.js";

const isTest = env.NODE_ENV === "test";

async function setupRateLimiting(fastify) {
  if (isTest) {
    // Skip rate limiting in test environment
    return;
  }

  await fastify.register(rateLimit, {
    max: env.RATE_LIMIT_MAX,
    timeWindow: env.RATE_LIMIT_TIME_WINDOW,
    keyGenerator: (req) => {
      // Use user ID if authenticated, otherwise IP
      return req.userId || req.ip;
    },
    errorResponseBuilder: (req, context) => {
      return {
        statusCode: STATUS_CODES.TOO_MANY_REQUESTS,
        error: "Too Many Requests",
        message: `Rate limit exceeded. Try again in ${Math.ceil(context.ttl / 1000)} seconds.`,
        retryAfter: Math.ceil(context.ttl / 1000),
      };
    },
    enableDraftSpec: true, // Enable for OpenAPI spec
    skipOnError: true, // Skip rate limiting on server errors
  });
}

export { setupRateLimiting };
