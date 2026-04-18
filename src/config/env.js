import { z } from "zod";
import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

/**
 * Custom preprocessor for booleans to handle strings like "false", "0", "true", "1" correctly.
 */
const booleanSchema = z.preprocess((val) => {
  if (typeof val === "string") {
    if (val.toLowerCase() === "true" || val === "1") return true;
    if (val.toLowerCase() === "false" || val === "0") return false;
  }
  return val;
}, z.boolean());

const envSchema = z.object({
  // Server Configuration
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(3001),
  HOST: z.string().default("localhost"),

  // Database
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),

  // JWT & Security
  JWT_SECRET: z.string().min(1, "JWT_SECRET is required"),
  JWT_REFRESH_SECRET: z.string().min(1, "JWT_REFRESH_SECRET is required"),
  JWT_EXPIRES_IN: z.string().default("15m"),
  JWT_REFRESH_EXPIRES_IN: z.string().default("7d"),

  // Logging & Elasticsearch
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),
  ELASTICSEARCH_URL: z.url().optional(),
  ELASTIC_INDEX_PREFIX: z.string().default("ecommerce-logs"),
  PRETTY_LOGS: booleanSchema.default(true),
  ELASTICSEARCH_MAX_RETRIES: z.coerce.number().default(15),
  ELASTICSEARCH_RETRY_DELAY_MS: z.coerce.number().default(2000),
  ENABLED_ELASTIC_LOGS: booleanSchema.default(true),

  // Kibana Settings
  KIBANA_URL: z.url().default("http://localhost:5601"),
  KIBANA_DATA_VIEW_TITLE: z.string().default("ecommerce-logs*"),
  KIBANA_DATA_VIEW_NAME: z.string().default("E-Commerce Logs"),
  KIBANA_TIME_FIELD: z.string().default("@timestamp"),
  KIBANA_MAX_RETRIES: z.coerce.number().default(10),
  KIBANA_RETRY_DELAY_MS: z.coerce.number().default(3000),

  // Rate Limiting
  RATE_LIMIT_MAX: z.coerce.number().default(100),
  RATE_LIMIT_TIME_WINDOW: z.coerce.number().default(60000),

  // CORS
  CORS_ORIGIN: z.string().default("*"),
});

const _env = envSchema.safeParse(process.env);

if (!_env.success) {
  const errors = z.flattenError(_env.error).fieldErrors;
  console.error("❌ Invalid environment variables:");
  Object.entries(errors).forEach(([field, messages]) => {
    console.error(`   - ${field}: ${messages?.join(", ")}`);
  });
  process.exit(1);
}

export const env = _env.data;
