import { createClient } from "@libsql/client";
import { env } from "../config/env.js";

const isTest = env.NODE_ENV === "test";

import crypto from "node:crypto";

// Single point of truth for the LibSQL connection
// In-memory for tests, env-based for dev/prod
const dbId = isTest ? crypto.randomUUID() : "dev";
export const db = createClient({
  url: isTest ? `file:test/db/test-${dbId}.sqlite` : env.DATABASE_URL,
});

export default db;
