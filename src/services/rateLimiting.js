const rateLimit = require("@fastify/rate-limit");

const isTest = process.env.NODE_ENV === "test";

async function setupRateLimiting(fastify) {
  if (isTest) {
    // Skip rate limiting in test environment
    return;
  }

  await fastify.register(rateLimit, {
    max: 100, // Max 100 requests per time window
    timeWindow: "1 minute", // Per minute
    keyGenerator: (req) => {
      // Use user ID if authenticated, otherwise IP
      return req.userId || req.ip;
    },
    errorResponseBuilder: (req, context) => {
      return {
        statusCode: 429,
        error: "Too Many Requests",
        message: `Rate limit exceeded. Try again in ${Math.ceil(context.ttl / 1000)} seconds.`,
        retryAfter: Math.ceil(context.ttl / 1000),
      };
    },
    enableDraftSpec: true, // Enable for OpenAPI spec
    skipOnError: true, // Skip rate limiting on server errors
  });
}

module.exports = { setupRateLimiting };
