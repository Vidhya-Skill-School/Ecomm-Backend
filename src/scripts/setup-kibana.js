import { setTimeout } from "node:timers/promises";
import { env } from "../config/env.js";

const {
  KIBANA_URL,
  KIBANA_DATA_VIEW_TITLE: DATA_VIEW_TITLE,
  KIBANA_DATA_VIEW_NAME: DATA_VIEW_NAME,
  KIBANA_TIME_FIELD: TIME_FIELD,
  KIBANA_MAX_RETRIES: MAX_RETRIES,
  KIBANA_RETRY_DELAY_MS: RETRY_DELAY_MS,
} = env;

/**
 * Probes Kibana's internal status API.
 */
const isKibanaReady = async () => {
  try {
    const response = await fetch(`${KIBANA_URL}/api/status`, {
      method: "GET",
      headers: { "kbn-xsrf": "true" },
    });
    return response.status === 200;
  } catch {
    return false;
  }
};

/**
 * Polling loop with sequential retry logic.
 */
const waitForKibana = async () => {
  console.log(`⏳ Waiting for Kibana to be ready at ${KIBANA_URL}...`);
  
  for (let i = 1; i <= MAX_RETRIES; i++) {
    if (await isKibanaReady()) {
      console.log("✅ Kibana is up and running!");
      return true;
    }
    
    console.log(`   (Attempt ${i}/${MAX_RETRIES}) Kibana not ready yet. Retrying in ${RETRY_DELAY_MS / 1000}s...`);
    
    if (i < MAX_RETRIES) {
      await setTimeout(RETRY_DELAY_MS);
    }
  }
  return false;
};

/**
 * Checks for existing Data View to ensure idempotency.
 */
const checkDataViewExists = async () => {
  const url = `${KIBANA_URL}/api/data_views`;
  const response = await fetch(url, {
    method: "GET",
    headers: { "kbn-xsrf": "true" },
  });

  if (!response.ok) return false;

  const { data_view } = await response.json();
  const views = Array.isArray(data_view) ? data_view : [];
  return views.some((dv) => dv.title === DATA_VIEW_TITLE);
};

/**
 * Creates the Data View mapping for log visualization.
 */
const createDataView = async () => {
  const url = `${KIBANA_URL}/api/data_views/data_view`;
  const body = {
    data_view: {
      title: DATA_VIEW_TITLE,
      name: DATA_VIEW_NAME,
      timeFieldName: TIME_FIELD,
    },
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "kbn-xsrf": "true",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`HTTP ${response.status}: ${text}`);
  }
};

// ==========================================
// 🚀 Orchestration (Modern Top-Level Pattern)
// ==========================================
console.log("==========================================");
console.log("🛠️  Kibana Setup Initialization");
console.log("==========================================");

try {
  const ready = await waitForKibana();
  
  if (!ready) {
    throw new Error(`Failed to connect to Kibana after ${MAX_RETRIES} attempts.`);
  }

  const exists = await checkDataViewExists();
  if (exists) {
    console.log("\n👌 Kibana Data View (Index Pattern) is already configured.");
  } else {
    console.log(`\n⚙️  Creating new Data View '${DATA_VIEW_TITLE}'...`);
    await createDataView();
    console.log("✅ Kibana Data View successfully created!");
  }

  console.log("\n==========================================");
  console.log("🚀 Setup Complete!");
  console.log(`📊 You can now view your logs at: ${KIBANA_URL}`);
  console.log("==========================================\n");
} catch (error) {
  console.error(`\n❌ Kibana Setup Failed: ${error.message}`);
  process.exit(1);
}
