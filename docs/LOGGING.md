# 📊 Logging & Observability (ELK Stack)

This project uses a fully automated **Elasticsearch + Kibana** pipeline for structured logging and monitoring.

## 🏗️ Architecture

```text
Fastify App → Pino Logger → Elasticsearch → Kibana Dashboard
     ↓              ↓              ↓              ↓
  API Calls    Structured    Indexed Logs    Visualization
               Logging       (@timestamp)
```

## ⚙️ How it Works (ES2025 Automation)

We have replaced manual dashboard setup with **Infrastructure-as-Code** scripts. When you run `docker compose up`, the following happens:

1.  **`elasticsearch-setup`**:
    *   Waits for Elasticsearch to be available.
    *   Applies a **Global Index Template** (`ecommerce-logs*`).
    *   Ensures strict mapping for fields like `@timestamp`, `correlationId`, and `userId`.
2.  **`kibana-setup`**:
    *   Waits for Kibana to be ready.
    *   Automatically creates the **Kibana Data View** so you don't have to manually click through "Stack Management".

---

## 🔍 How to View Logs

1.  Open **Kibana Discover**: [http://localhost:5601/app/discover](http://localhost:5601/app/discover)
2.  Select the **"E-Commerce Logs"** data view from the dropdown.
3.  Set the time range to **"Last 15 minutes"**.

### 💡 Useful Kibana Queries (KQL)

| Goal | Query |
| :--- | :--- |
| **Search errors** | `level: error` |
| **Track a request** | `correlationId: "550e...4000"` |
| **Business events** | `type: "business_event"` |
| **Failed logins** | `event: "failed_login"` |
| **Slow requests** | `responseTimeMs > 1000` |

---

## 🛠️ Troubleshooting Logs

### "I don't see any logs"
1.  **Check the Master Switch:** Ensure `ENABLED_ELASTIC_LOGS=true` is set in your `.env`.
2.  **Verify Indices:** Run `curl http://localhost:9200/_cat/indices?v`. Look for `ecommerce-logs`.
3.  **Check Client Version:** Ensure `@elastic/elasticsearch` major version matches your server (v8).
4.  **IP Address:** On macOS, try setting `ELASTICSEARCH_URL=http://127.0.0.1:9200` in `.env`.

### Resetting the Stack
If you want to clear all logs and start fresh:
```bash
docker compose down -v
docker compose up -d
```

---

[⬅️ Back to Main README](../README.md)
