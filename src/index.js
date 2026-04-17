import { env } from "./config/env.js";
import { initializeApp } from "./app.js";
import loggerService from "./services/logger.js";
import db from "./db/connection.js";

void (async () => {
  let server;
  try {
    // Verify checked environment variables
    console.log("🔍 Environment check:");
    console.log(`   NODE_ENV: ${env.NODE_ENV}`);
    console.log(`   ELASTICSEARCH_URL: ${env.ELASTICSEARCH_URL || "N/A"}`);
    console.log(`   LOG_LEVEL: ${env.LOG_LEVEL}`);
    console.log("");

    server = await initializeApp();

    await server.listen({
      port: env.PORT,
      host: env.HOST,
    });

    // Graceful Shutdown Handler
    const shutdown = async (signal) => {
      server.logger.info(`Received ${signal}. Shutting down gracefully...`);

      // 1. Close the server (stops accepting new connections)
      await server.close();
      server.logger.info("Server connections successfully closed.");

      // 2. Shut down external storage/logging sinks
      try {
        // Shutdown Log Client
        const esClient = loggerService.getElasticClient();
        if (esClient) {
          await esClient.close();
          console.log("✅ Elasticsearch connection closed.");
        }

        // Shutdown Database Client
        if (db) {
          await db.close();
          console.log("✅ Database connection closed.");
        }
      } catch (err) {
        console.error("❌ Error during connection cleanup:", err);
      }

      server.logger.info("Graceful shutdown completed. Process exiting.");
      process.exit(0);
    };

    // Listen for interruption signals
    ["SIGINT", "SIGTERM"].forEach((signal) => {
      process.on(signal, () => shutdown(signal));
    });

    server.logger.debug(
      {
        port: env.PORT,
        host: env.HOST,
        env: env.NODE_ENV,
      },
      "API Server has started successfully",
    );

    console.log("========================================");
    console.log("✨ E-commerce API Server running!");
    console.log("========================================");
    console.log(`API:    http://localhost:${env.PORT}/api/v1`);
    console.log(`Docs:   http://localhost:${env.PORT}/docs`);
    console.log(`Health: http://localhost:${env.PORT}/health`);
    console.log("========================================\n");
  } catch (err) {
    if (server) {
      server.log.error(err);
    } else {
      console.error("Initialization failed:", err);
    }
    process.exit(1);
  }
})();
