// services/logger.js
import pino from "pino";
import pinoElastic from "pino-elasticsearch";
import { env } from "../config/env.js";

const isTest = env.NODE_ENV === "test";
// const elasticsearchUrl = env.ELASTICSEARCH_URL;

import { Client } from "@elastic/elasticsearch";

const yellow = (s) => `\x1b[33m${s}\x1b[0m`;

let logger;
let esClient = null;

/**
 * Initialize the logger based on environment and connectivity.
 * Uses top-level await to ensure the logger is ready before any app logs are sent.
 */
const initializeLogger = async () => {
  if (isTest) {
    console.log("🔇 Test mode - logging disabled");
    return pino({ level: "silent" });
  }

  const shouldEnableElastic = env.ENABLED_ELASTIC_LOGS && env.ELASTICSEARCH_URL;

  if (shouldEnableElastic) {
    try {
      esClient = new Client({ node: env.ELASTICSEARCH_URL });
      console.log("✅ Connecting to Elasticsearch for remote logging.");

      const streamToElastic = pinoElastic({
        index: env.ELASTIC_INDEX_PREFIX,
        node: env.ELASTICSEARCH_URL,
        flushBytes: 1,
        flushInterval: 1000,
        "es.version": 8,
      });

      streamToElastic.on("error", (err) => {
        console.error("❌ Elasticsearch stream error:", err);
      });

      return pino(
        {
          level: env.LOG_LEVEL,
          formatters: {
            level: (label) => ({ level: label }),
            bindings: (bindings) => ({
              pid: bindings.pid,
              host: bindings.hostname,
              service: "ecommerce-api",
              environment: env.NODE_ENV,
            }),
            log: (object) => {
              const { time, ...rest } = object;
              return {
                "@timestamp": time || new Date().toISOString(),
                ...rest,
              };
            },
          },
          timestamp: pino.stdTimeFunctions.isoTime,
        },
        streamToElastic,
      );
    } catch (error) {
      console.log(yellow("\n⚠️  Elasticsearch logging is disabled, you need to start it for logging (Connectivity failed)"));
      console.log("📝 Falling back to console logging\n", error);
      esClient = null;
    }
  } else if (env.ELASTICSEARCH_URL && !env.ENABLED_ELASTIC_LOGS) {
    console.log(yellow("\n⚠️  Elasticsearch logging is disabled (ENABLED_ELASTIC_LOGS is false)"));
    console.log("📝 Falling back to console logging\n");
  } else if (!env.ELASTICSEARCH_URL) {
    console.log("📝 Console logging active (ELASTICSEARCH_URL missing)");
  }

  // Fallback Console Logger
  return pino({
    level: env.LOG_LEVEL,
    transport: {
      target: "pino-pretty",
      options: {
        colorize: true,
        translateTime: "SYS:standard",
        ignore: "pid,hostname",
      },
    },
  });
};

// Top-level await for logger initialization
logger = await initializeLogger();

class LoggerService {
  getLogger() {
    return logger;
  }

  logBusinessEvent(event, data, userId = null, correlationId = null) {
    logger.info({
      type: "business_event",
      event,
      userId,
      correlationId,
      timestamp: new Date().toISOString(),
      data,
    });
  }

  logSecurityEvent(event, userId = null, details = {}) {
    logger.warn({
      type: "security_event",
      event,
      userId,
      timestamp: new Date().toISOString(),
      ...details,
    });
  }

  logPerformance(operation, durationMs, metadata = {}) {
    logger.info({
      type: "performance",
      operation,
      durationMs,
      timestamp: new Date().toISOString(),
      ...metadata,
    });
  }

  logError(error, req = null, additionalContext = {}) {
    const logEntry = {
      type: "error",
      message: error.message,
      stack: error.stack,
      code: error.code,
      statusCode: error.statusCode,
      timestamp: new Date().toISOString(),
      ...additionalContext,
    };

    if (req) {
      logEntry.correlationId = req.correlationId;
      logEntry.method = req.method;
      logEntry.url = req.url;
      logEntry.userId = req.user?.id;
    }

    logger.error(logEntry, error.message);
  }

  getElasticClient() {
    return esClient;
  }

  async close() {
    if (esClient) {
      await esClient.close();
      esClient = null;
    }
  }
}

export default new LoggerService();
