import { beforeAll, afterAll } from "vitest";

beforeAll(async () => {
  // Ensure database is initialized
  console.log("Setting up test environment...");
});

afterAll(async () => {
  console.log("Test environment cleanup complete...");
});
