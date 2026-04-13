import { initializeApp } from "./app.js";

void (async () => {
  try {
    const fastify = await initializeApp();
    await fastify.listen({ port: 3001, host: "0.0.0.0" });
    console.log("\n========================================");
    console.log("✨ E-commerce API Server running!");
    console.log("========================================");
    console.log("API:    http://localhost:3001");
    console.log("Docs:   http://localhost:3001/docs");
    console.log("Health: http://localhost:3001/health");
    console.log("Stats:  http://localhost:3001/statistics");
    console.log("========================================\n");
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
