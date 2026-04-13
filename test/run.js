import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { build } from "./helper.js";

// Import all test suites
import "./routes/auth.e2e.test.js";
import "./routes/products.e2e.test.js";
import "./routes/orders.e2e.test.js";
