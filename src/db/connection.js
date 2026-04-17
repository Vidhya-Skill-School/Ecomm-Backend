import { createClient } from "@libsql/client";
import { env } from "../config/env.js";
import path from "node:path";
import crypto from "node:crypto";

const isTest = env.NODE_ENV === "test";

// Single point of truth for the LibSQL connection
// In-memory for tests, env-based for dev/prod
const dbId = isTest ? crypto.randomUUID() : "dev";
const testDbPath = path.join("test", "db", `test-${dbId}.sqlite`);

export const db = createClient({
  url: isTest ? `file:${testDbPath}` : env.DATABASE_URL,
});

export default db;
