// test-es-log.js
import "dotenv/config";
import loggerService from "./services/logger.js";

console.log("=== Testing Elasticsearch Logging ===\n");

const logger = loggerService.getLogger();

// Send multiple test logs
logger.info({ test: true, message: "Test log 1" }, "Simple test message");
logger.warn({ test: true, message: "Test warning" });
logger.error({ test: true, message: "Test error" });

loggerService.logBusinessEvent(
  "test_event",
  { testData: "Hello" },
  "user123",
  "corr-123",
);
loggerService.logPerformance("test_operation", 1234, { extra: "data" });
loggerService.logSecurityEvent("test_security", "user-123", {
  ip: "127.0.0.1",
});

console.log("\n✅ Test logs sent!");
console.log("Wait 5 seconds, then check Elasticsearch...\n");

setTimeout(async () => {
  console.log("Checking Elasticsearch...");
  const response = await fetch("http://localhost:9200/ecommerce-logs/_count");
  const data = await response.json();
  console.log(`Total documents in ecommerce-logs: ${data.count || 0}`);

  if (data.count > 0) {
    console.log("\n✅ SUCCESS! Logs are reaching Elasticsearch!");
    console.log("Now check Kibana: http://localhost:5601/app/discover");
  } else {
    console.log("\n❌ No logs found in Elasticsearch");
    console.log("Check if Elasticsearch is running: docker compose ps");
  }
}, 5000);
