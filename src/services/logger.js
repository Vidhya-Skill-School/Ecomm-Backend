// services/logger.js
import pino from "pino";
import pinoElastic from "pino-elasticsearch";
import { env } from "../config/env.js";

const isTest = env.NODE_ENV === "test";
const elasticsearchUrl = env.ELASTICSEARCH_URL;

import { Client } from "@elastic/elasticsearch";

let logger;
let esClient = null;

if (elasticsearchUrl) {
  esClient = new Client({ node: elasticsearchUrl });
}

if (isTest) {
  logger = pino({ level: "silent" });
  console.log("🔇 Test mode - logging disabled");
} else if (elasticsearchUrl) {
  console.log(`✅ Configuring Elasticsearch logging: ${elasticsearchUrl}`);

  const streamToElastic = pinoElastic({
    index: "ecommerce-logs",
    node: elasticsearchUrl,
    flushBytes: 1,
    flushInterval: 1000,
    "es.version": 8,
  });

  streamToElastic.on("error", (err) => {
    console.error("❌ Elasticsearch stream error:", err);
  });

  streamToElastic.on("insert", (data) => {
    console.log(`📊 Log sent to Elasticsearch: ${data.index}`);
  });

  logger = pino(
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
        // THIS IS KEY - Ensure timestamp is always @timestamp
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

  console.log("✅ Logger sending to Elasticsearch");
} else {
  console.log(
    "📝 Using console logging (set ELASTICSEARCH_URL for Elasticsearch)",
  );
  logger = pino({
    level: "debug",
    transport: {
      target: "pino-pretty",
      options: {
        colorize: true,
        translateTime: "SYS:standard",
        ignore: "pid,hostname",
      },
    },
  });
}

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
