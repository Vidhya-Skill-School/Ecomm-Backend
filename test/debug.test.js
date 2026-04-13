import { describe, it, expect } from "vitest";
import { build } from "./helper.js";

describe("Debug API Calls", () => {
  it("should show API is being called", async () => {
    const app = await build();

    console.log("\n=== Testing Real API ===");

    const response = await app.inject({
      method: "GET",
      url: "/health",
    });

    console.log("Health check response:", response.statusCode);
    console.log("Health check body:", response.body);

    expect(response.statusCode).toBe(200);
  });
});
