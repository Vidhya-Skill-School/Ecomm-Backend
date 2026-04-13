import { beforeAll, afterAll } from "vitest";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

beforeAll(async () => {
  // Ensure database is initialized
  console.log("Setting up test environment...");
});

afterAll(async () => {
  console.log("Test environment cleanup complete...");
});
