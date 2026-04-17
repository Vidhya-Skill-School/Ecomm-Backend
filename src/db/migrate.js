import { Umzug } from "umzug";
import path from "node:path";
import { fileURLToPath } from "node:url";
import db from "./connection.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Custom storage implementation for LibSQL/SQLite
 */
class LibSQLStorage {
  async logMigration({ name }) {
    await db.execute({
      sql: "INSERT INTO migrations (name) VALUES (?)",
      args: [name],
    });
  }

  async unlogMigration({ name }) {
    await db.execute({
      sql: "DELETE FROM migrations WHERE name = ?",
      args: [name],
    });
  }

  async executed() {
    try {
      const res = await db.execute("SELECT name FROM migrations ORDER BY name ASC");
      return res.rows.map((row) => row.name);
    } catch (e) {
      // If table doesn't exist, return empty
      console.log(e)
      return [];
    }
  }
}

const umzug = new Umzug({
  migrations: {
    glob: ["migrations/*.js", { cwd: __dirname }],
  },
  context: db,
  storage: new LibSQLStorage(),
  logger: console,
  create: {
    folder: path.join(__dirname, "migrations"),
    template: (filepath) => [
      [filepath, "export async function up({ context }) {}\nexport async function down({ context }) {}\n"],
    ],
  },
});

/**
 * Run all pending migrations
 */
export async function runMigrations() {
  // Ensure migrations table exists
  await db.execute(`
    CREATE TABLE IF NOT EXISTS migrations (
      name TEXT PRIMARY KEY,
      executed_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await umzug.up();
}

export { umzug };
