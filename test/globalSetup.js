/**
 * Vitest Global Setup
 *
 * Runs once before ALL test suites in the main process.
 * Responsible for:
 * 1. Deleting stale test.sqlite from previous runs.
 * 2. Running all migrations using its OWN throwaway DB client.
 * 3. Closing that client so the test worker fork can open the file cleanly.
 */
import fs from "node:fs";
import path from "node:path";

export async function setup() {
  process.env.NODE_ENV = "test";

  const testDbDir = path.resolve(process.cwd(), "test/db");

  // Create test/db if it doesn't exist
  if (!fs.existsSync(testDbDir)) {
    fs.mkdirSync(testDbDir, { recursive: true });
  }

  // Delete all stale SQLite files in test/db
  const files = fs.readdirSync(testDbDir);
  for (const file of files) {
    if (file.endsWith(".sqlite")) {
      fs.unlinkSync(path.join(testDbDir, file));
      console.log(`🧹 Cleaned up stale ${file}`);
    }
  }

  const dbPath = path.join(testDbDir, "migration-temp.sqlite");

  // Use a dedicated client that we can explicitly close after migration.
  // We do NOT use connection.js here to avoid the singleton staying open
  // across the process boundary (parent vs. fork), which causes SQLITE_BUSY.
  const { createClient } = await import("@libsql/client");
  const { Umzug } = await import("umzug");

  const db = createClient({ url: `file:${dbPath}` });

  // Ensure migrations tracking table exists
  await db.execute(`
    CREATE TABLE IF NOT EXISTS migrations (
      name TEXT PRIMARY KEY,
      executed_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Simple LibSQL storage for umzug
  const storage = {
    async logMigration({ name }) {
      await db.execute({ sql: "INSERT INTO migrations (name) VALUES (?)", args: [name] });
    },
    async unlogMigration({ name }) {
      await db.execute({ sql: "DELETE FROM migrations WHERE name = ?", args: [name] });
    },
    async executed() {
      try {
        const res = await db.execute("SELECT name FROM migrations ORDER BY name ASC");
        return res.rows.map((r) => r.name);
      } catch {
        return [];
      }
    },
  };

  const migrationsDir = path.resolve(process.cwd(), "src/db/migrations");

  const umzug = new Umzug({
    migrations: { glob: ["*.js", { cwd: migrationsDir }] },
    context: db,
    storage,
    logger: console,
  });

  await umzug.up();
  console.log("✅ Test database migrated successfully");

  // CRITICAL: Close the client so the test fork has exclusive access
  db.close();
}

export async function teardown() {
  const testDbDir = path.resolve(process.cwd(), "test/db");
  if (fs.existsSync(testDbDir)) {
    const files = fs.readdirSync(testDbDir);
    for (const file of files) {
      if (file.endsWith(".sqlite")) {
        fs.unlinkSync(path.join(testDbDir, file));
      }
    }
    console.log("🧹 Cleaned up all test database files from test/db/");
  }
}
