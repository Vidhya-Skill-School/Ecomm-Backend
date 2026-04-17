import { STATUS_CODES } from "../../shared/constants.js";

async function healthRoutes(fastify, _opts) {
  fastify.get("/health", {
    schema: {
      description: "App health check",
      tags: ["System"],
      response: {
        [STATUS_CODES.OK]: {
          type: "object",
          properties: {
            status: { type: "string" },
            timestamp: { type: "string" },
            uptime: { type: "number" },
            checks: {
              type: "object",
              properties: {
                database: { type: "string" },
                elasticsearch: { type: "string" },
              },
            },
          },
        },
      },
    },
    handler: async (req, reply) => {
      let dbStatus = "healthy";
      let esStatus = "healthy";

      // 1. Check Database using the unified client
      try {
        await req.server.db.execute("SELECT 1");
      } catch (err) {
        dbStatus = "unhealthy";
        req.log.error(err, "Health check: Database failure");
      }

      // 2. Check Elasticsearch via the registered service if applicable
      // For now, we use the loggerService's client as we did before
      const loggerService = (await import("../../services/logger.js")).default;
      const esClient = loggerService.getElasticClient();
      
      if (esClient) {
        try {
          await esClient.ping();
        } catch (err) {
          esStatus = "unhealthy";
          req.log.warn(err, "Health check: Elasticsearch failure");
        }
      } else {
        esStatus = "not_configured";
      }

      const isHealthy = dbStatus === "healthy";
      const statusCode = isHealthy ? STATUS_CODES.OK : STATUS_CODES.INTERNAL_SERVER_ERROR;

      return reply.code(statusCode).send({
        status: isHealthy ? "ok" : "partially_degraded",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        checks: {
          database: dbStatus,
          elasticsearch: esStatus,
        },
      });
    },
  });
}

export default healthRoutes;
