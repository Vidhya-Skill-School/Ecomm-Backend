import fs from "fs";
import path from "path";
import readline from "readline";
import { pathToFileURL } from "url";
import { hashPassword } from "./jwt.js";
import {
  initializeDatabase,
  clearProducts,
  bulkInsertProducts,
  db,
} from "../db.js";

// Inline ANSI colors — no extra dependency needed
const red = (s) => `\x1b[31m${s}\x1b[0m`;
const green = (s) => `\x1b[32m${s}\x1b[0m`;
const yellow = (s) => `\x1b[33m${s}\x1b[0m`;

const PRODUCTS_FILE = path.join(process.cwd(), "src", "data", "products.json");

// ─── readline interface (recreated as needed) ────────────────────────────────
let rl = null;

function getRL() {
  if (!rl || rl.closed) {
    rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: true,
    });
  }
  return rl;
}

function closeRL() {
  if (rl && !rl.closed) {
    rl.close();
    rl = null;
  }
}

// ─── Normal question (readline, with validation) ─────────────────────────────
function askQuestion(question, validator = null, errorMessage = null) {
  return new Promise((resolve) => {
    const ask = () => {
      getRL().question(question, (answer) => {
        if (validator && !validator(answer)) {
          console.log(red(`❌ ${errorMessage || "Invalid input"}`));
          ask();
        } else {
          resolve(answer);
        }
      });
    };
    ask();
  });
}

// ─── Hidden password input ────────────────────────────────────────────────────
// Key insight: readline holds stdin and echoes everything.
// We CLOSE rl before switching to raw mode, then it gets recreated on next use.
// Error is printed in red ONLY after the user presses Enter.
function askPassword(question, validator = null, errorMessage = null) {
  return new Promise((resolve) => {
    const stdin = process.stdin;
    const stdout = process.stdout;

    const attempt = () => {
      // ❶ Release readline's grip on stdin so raw mode works
      closeRL();

      stdout.write(question);

      // ❷ Take over stdin in raw mode — nothing echoed
      stdin.setRawMode(true);
      stdin.resume();
      stdin.setEncoding("utf8");

      let password = "";

      const onData = (chunk) => {
        const char = chunk.toString();

        if (char === "\r" || char === "\n") {
          // ❸ Enter pressed — stop raw mode, validate
          stdin.setRawMode(false);
          stdin.pause();
          stdin.removeListener("data", onData);
          stdout.write("\n");

          if (validator && !validator(password)) {
            console.log(red(`❌ ${errorMessage || "Invalid password"}`));
            attempt(); // retry — error shown, then re-prompt
          } else {
            resolve(password);
          }
        } else if (char === "\u007f" || char === "\b") {
          // Backspace — silently remove last char
          if (password.length > 0) {
            password = password.slice(0, -1);
          }
        } else if (char === "\u0003") {
          // Ctrl+C
          stdout.write("\n");
          console.log(red("❌ Cancelled"));
          process.exit(0);
        } else if (char.charCodeAt(0) >= 32 && char.charCodeAt(0) <= 126) {
          // Printable — store silently, print NOTHING
          password += char;
        }
      };

      stdin.on("data", onData);
    };

    attempt();
  });
}

// ─── Real-time input with validation (non-password) ──────────────────────────
function askQuestionRealtime(question, validator, errorMessage, onValid) {
  return new Promise((resolve) => {
    // Must close readline before entering raw mode
    closeRL();

    const stdin = process.stdin;
    const stdout = process.stdout;

    const attempt = () => {
      stdout.write(question);
      stdin.setRawMode(true);
      stdin.resume();
      stdin.setEncoding("utf8");

      let input = "";
      let cursorPos = 0;

      const render = () => {
        readline.clearLine(stdout, 0);
        readline.cursorTo(stdout, 0);
        stdout.write(question + input);
        readline.cursorTo(stdout, question.length + cursorPos);
      };

      const onData = (chunk) => {
        const char = chunk.toString();

        if (char === "\r" || char === "\n") {
          stdin.setRawMode(false);
          stdin.pause();
          stdin.removeListener("data", onData);
          stdout.write("\n");

          if (validator && !validator(input)) {
            console.log(red(`❌ ${errorMessage || "Invalid input"}`));
            attempt(); // retry
          } else {
            if (onValid) onValid(input);
            resolve(input);
          }
        } else if (char === "\u007f" || char === "\b") {
          if (cursorPos > 0) {
            input = input.slice(0, cursorPos - 1) + input.slice(cursorPos);
            cursorPos--;
            render();
          }
        } else if (char === "\u001b[D") {
          // left arrow
          if (cursorPos > 0) {
            cursorPos--;
            readline.cursorTo(stdout, question.length + cursorPos);
          }
        } else if (char === "\u001b[C") {
          // right arrow
          if (cursorPos < input.length) {
            cursorPos++;
            readline.cursorTo(stdout, question.length + cursorPos);
          }
        } else if (char === "\u001b[3~") {
          // delete key
          if (cursorPos < input.length) {
            input = input.slice(0, cursorPos) + input.slice(cursorPos + 1);
            render();
          }
        } else if (char === "\u0003") {
          stdout.write("\n");
          console.log(red("❌ Cancelled"));
          process.exit(0);
        } else if (char.charCodeAt(0) >= 32 && char.charCodeAt(0) <= 126) {
          input = input.slice(0, cursorPos) + char + input.slice(cursorPos);
          cursorPos++;
          render();
        }
      };

      stdin.on("data", onData);
      render();
    };

    attempt();
  });
}

// ─── Clear all data ───────────────────────────────────────────────────────────
async function clearAllData() {
  console.log("🗑️  Clearing existing data...");
  await db.execute("DELETE FROM order_status_history");
  console.log("  ✓ Cleared order status history");
  await db.execute("DELETE FROM orders");
  console.log("  ✓ Cleared orders");
  await db.execute("DELETE FROM cart");
  console.log("  ✓ Cleared cart");
  await db.execute("DELETE FROM user_sessions");
  console.log("  ✓ Cleared user sessions");
  await db.execute("DELETE FROM users");
  console.log("  ✓ Cleared users");
  await db.execute(
    "DELETE FROM sqlite_sequence WHERE name IN ('orders', 'cart', 'user_sessions', 'users')",
  );
  console.log("  ✓ Reset auto-increment counters");
}

// ─── Create first user ────────────────────────────────────────────────────────
async function createFirstUser() {
  console.log("\n📝 Create First User");
  console.log("==================");

  const email = await askQuestionRealtime(
    "Email: ",
    (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
    "Please enter a valid email address (e.g., user@example.com)",
  );

  const name = await askQuestionRealtime(
    "Name: ",
    (v) => {
      const t = v.trim();
      return t.length >= 2 && t.length <= 100 && /^[a-zA-Z\s\-']+$/.test(t);
    },
    "Name must be 2-100 characters and contain only letters, spaces, hyphens, and apostrophes",
  );

  const phone = await askQuestionRealtime(
    "Phone (10 digits): ",
    (v) => /^\d{10}$/.test(v.replace(/\D/g, "")),
    "Phone number must be exactly 10 digits",
  );

  console.log("\nPassword Requirements:");
  console.log("  • At least 6 characters");
  console.log("  • At least 1 uppercase letter");
  console.log("  • At least 1 lowercase letter");
  console.log("  • At least 1 number");
  console.log('  • At least 1 special character (!@#$%^&*(),.?":{}|<>)');

  const password = await askPassword(
    "Password: ",
    (v) =>
      v.length >= 6 &&
      /[A-Z]/.test(v) &&
      /[a-z]/.test(v) &&
      /\d/.test(v) &&
      /[!@#$%^&*(),.?":{}|<>]/.test(v),
    "Password must be 6+ chars with uppercase, lowercase, number & special character",
  );

  await askPassword(
    "Confirm Password: ",
    (v) => v === password,
    "Passwords do not match. Please try again.",
  );

  const formattedPhone = phone.replace(/\D/g, "");

  try {
    const existingUser = await db.execute({
      sql: "SELECT id FROM users WHERE email = ?",
      args: [email],
    });

    if (existingUser.rows.length > 0) {
      console.log(red("\n❌ User with this email already exists"));
      return false;
    }

    const hashedPassword = hashPassword(password);

    await db.execute({
      sql: `INSERT INTO users (email, name, phone, password) VALUES (?, ?, ?, ?)`,
      args: [email, name, formattedPhone, hashedPassword],
    });

    console.log(green("\n✅ First user created successfully!"));
    console.log(yellow("⚠️  Please save these credentials securely!"));
    console.log(`\n📋 User Details:`);
    console.log(`   Email: ${email}`);
    console.log(`   Name:  ${name}`);
    console.log(`   Phone: ${formattedPhone}`);

    return true;
  } catch (error) {
    console.log(red(`\n❌ Failed to create user: ${error.message}`));
    return false;
  }
}

// ─── Main seeder ──────────────────────────────────────────────────────────────
async function seedDatabase() {
  try {
    console.log("\n🌱 Starting database seeding...\n");

    await initializeDatabase();
    console.log("✓ Database initialized\n");

    const interactive = process.stdin.isTTY && process.stdout.isTTY;

    const clearExisting = interactive
      ? await askQuestion("Do you want to clear all existing data? (y/N): ")
      : "n";

    if (clearExisting.toLowerCase() === "y") {
      await clearAllData();
      console.log("");
    } else {
      console.log(yellow("⚠️  Keeping existing data\n"));
    }

    if (!fs.existsSync(PRODUCTS_FILE)) {
      console.error(red("✗ products.json not found!"));
      console.error(`  Expected location: ${PRODUCTS_FILE}`);
      console.log(yellow("\n⚠️  Skipping products seeding..."));
    } else {
      const data = fs.readFileSync(PRODUCTS_FILE, "utf8");
      const products = JSON.parse(data);
      console.log(`✓ Loaded ${products.length} products from products.json`);

      const seedProducts = interactive
        ? await askQuestion("Do you want to seed products? (Y/n): ")
        : "y";

      if (seedProducts.toLowerCase() !== "n") {
        await clearProducts();
        console.log("✓ Cleared existing products");

        const formattedProducts = products
          .map((p) => {
            if (!p.title || !p.price) {
              console.warn(
                yellow(
                  `⚠️  Skipping product with missing title or price: ${p.title || "Unknown"}`,
                ),
              );
              return null;
            }
            return {
              title: p.title,
              description: p.description || "",
              price: parseFloat(p.price) || 0,
              category: p.category || "Uncategorized",
              rating: parseFloat(p.rating) || 0,
              stock: parseInt(p.stock) || 0,
              brand: p.brand || null,
              createdAt: p.createdAt
                ? new Date(p.createdAt).toISOString()
                : new Date().toISOString(),
            };
          })
          .filter(Boolean);

        if (formattedProducts.length === 0) {
          console.log(red("❌ No valid products to insert"));
        } else {
          await bulkInsertProducts(formattedProducts);
          console.log(green(`✓ Inserted ${formattedProducts.length} products`));
          if (formattedProducts.length < products.length) {
            console.log(
              yellow(
                `⚠️  Skipped ${products.length - formattedProducts.length} invalid products`,
              ),
            );
          }
        }
      } else {
        console.log(yellow("⚠️  Skipping products seeding..."));
      }
    }

    console.log("");

    const createUser = interactive
      ? await askQuestion("Do you want to create your first user? (Y/n): ")
      : "n";

    if (createUser.toLowerCase() !== "n") {
      await createFirstUser();
    }

    closeRL();
    console.log(green("\n✨ Database seeding completed successfully!"));
    process.exit(0);
  } catch (error) {
    console.error(red(`\n✗ Seeding failed: ${error.message}`));
    console.error(error.stack);
    closeRL();
    process.exit(1);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  seedDatabase();
}

export { seedDatabase, clearAllData, createFirstUser };
