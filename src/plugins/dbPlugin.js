import fp from "fastify-plugin";
import db from "../db/connection.js";

async function dbPlugin(fastify, _opts) {
  // Inject the shared database connection
  fastify.decorate("db", db);

  // Connection health verification
  try {
    await db.execute("SELECT 1");
    fastify.log.info("✓ Database connection established");
  } catch (err) {
    fastify.log.error(err, "✗ Database connection failed");
    throw err;
  }

  // Graceful cleanup
  fastify.addHook("onClose", async (instance) => {
    await instance.db.close();
    fastify.log.info("✓ Database connection closed");
  });
}

export default fp(dbPlugin);
