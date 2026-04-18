import { Client } from "@elastic/elasticsearch";
import { setTimeout } from "node:timers/promises";
import { env } from "../config/env.js";

const {
  ELASTICSEARCH_URL,
  ELASTICSEARCH_MAX_RETRIES: MAX_RETRIES,
  ELASTICSEARCH_RETRY_DELAY_MS: RETRY_DELAY_MS,
  ELASTIC_INDEX_PREFIX,
} = env;

/**
 * Checks if Elasticsearch is alive using native fetch (more reliable for boot checks).
 */
const isElasticReady = async () => {
  try {
    const response = await fetch(ELASTICSEARCH_URL, { signal: AbortSignal.timeout(2000) });
    return response.ok || response.status === 401; // 401 still means it's "up" but needs auth
  } catch (err) {
    return err.message || "Connection failed";
  }
};

/**
 * Polling loop to wait for ES to boot.
 */
const waitForElasticsearch = async () => {
  console.log(`⏳ Waiting for Elasticsearch to be ready at ${ELASTICSEARCH_URL}...`);
  
  for (let i = 1; i <= MAX_RETRIES; i++) {
    const status = await isElasticReady();
    
    if (status === true) {
      console.log("✅ Elasticsearch is up and accepting connections!");
      return true;
    }
    
    console.log(`   (Attempt ${i}/${MAX_RETRIES}) Not ready: ${status}. Retrying in ${RETRY_DELAY_MS / 1000}s...`);
    
    if (i < MAX_RETRIES) {
      await setTimeout(RETRY_DELAY_MS);
    }
  }
  return false;
};

/**
 * Configures the index template using v8 client syntax.
 */
const setupIndexTemplate = async (client) => {
  const templateName = `${ELASTIC_INDEX_PREFIX}-template`;
  const indexPattern = `${ELASTIC_INDEX_PREFIX}*`;
  
  console.log(`⚙️  Configuring Elasticsearch Index Template '${templateName}'...`);
  
  const exists = await client.indices.existsIndexTemplate({ name: templateName });
  if (exists) {
    console.log("👌 Index Template is already configured.");
    return;
  }

  await client.indices.putIndexTemplate({
    name: templateName,
    index_patterns: [indexPattern],
    template: {
      mappings: {
        properties: {
          "@timestamp": { type: "date" },
          level: { type: "keyword" },
          type: { type: "keyword" },
          event: { type: "keyword" },
          userId: { type: "keyword" },
          correlationId: { type: "keyword" },
        }
      }
    }
  });
  
  console.log("✅ Elasticsearch Index Template successfully created!");
};

// ==========================================
// 🚀 Orchestration
// ==========================================
console.log("==========================================");
console.log("🛠️  Elasticsearch Setup Initialization");
console.log("==========================================");

if (!ELASTICSEARCH_URL) {
  console.warn("⚠️ ELASTICSEARCH_URL is not defined. Skipping setup.");
  process.exit(0);
}

try {
  const ready = await waitForElasticsearch();
  
  if (!ready) {
    throw new Error(`Failed to connect to Elasticsearch after ${MAX_RETRIES} attempts.`);
  }

  // Once reachable, use the specialized client for operations
  const client = new Client({ node: ELASTICSEARCH_URL });
  
  try {
    await setupIndexTemplate(client);
  } finally {
    await client.close();
  }

  console.log("\n==========================================");
  console.log("🚀 Setup Complete!");
  console.log(`📊 Nodes accessible at: ${ELASTICSEARCH_URL}`);
  console.log("==========================================\n");
} catch (error) {
  console.error(`\n❌ Setup Failed: ${error.message}`);
  process.exit(1);
}
