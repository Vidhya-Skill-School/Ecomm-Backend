import fp from "fastify-plugin";

async function observabilityPlugin(fastify, _opts) {
  // 1. Mark start time
  fastify.addHook("onRequest", async (request, _reply) => {
    request.startTime = process.hrtime();
  });

  // 2. Inject X-Response-Time and X-Request-ID headers
  fastify.addHook("onSend", async (request, reply, payload) => {
    if (request.startTime) {
      const diff = process.hrtime(request.startTime);
      const responseTimeMs = (diff[0] * 1e3 + diff[1] * 1e-6).toFixed(2);
      
      reply.header("X-Response-Time", `${responseTimeMs}ms`);
      request.responseTime = responseTimeMs;
    }
    
    reply.header("X-Request-ID", request.id);
    return payload;
  });

  // 3. Log completion after response sent
  fastify.addHook("onResponse", async (request, reply) => {
    request.log.info({
      url: request.url,
      method: request.method,
      statusCode: reply.statusCode,
      responseTime: request.responseTime ? `${request.responseTime}ms` : "unknown",
      requestId: request.id,
    }, "Request completed");
  });
}

export default fp(observabilityPlugin);
