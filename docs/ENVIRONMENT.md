# 🌍 Environment Configuration

This project uses a centralized and validated configuration system. All variables are defined in `.env` and validated at runtime via `src/config/env.js`.

```
# ==============================================================================
# 🚀 SERVER CONFIGURATION
# ==============================================================================
NODE_ENV=production
PORT=3001
HOST=localhost

# ==============================================================================
# 📊 ELASTICSEARCH LOGGING
# ==============================================================================
ENABLED_ELASTIC_LOGS=true
ELASTICSEARCH_URL=http://localhost:9200
ELASTIC_INDEX_PREFIX=ecommerce-logs
PRETTY_LOGS=false
ELASTICSEARCH_MAX_RETRIES=15
ELASTICSEARCH_RETRY_DELAY_MS=2000

# ==============================================================================
# 🎨 KIBANA UI CONFIGURATION
# ==============================================================================
KIBANA_URL=http://localhost:5601
KIBANA_DATA_VIEW_TITLE=ecommerce-logs*
KIBANA_DATA_VIEW_NAME=E-Commerce Logs
KIBANA_TIME_FIELD=@timestamp
KIBANA_MAX_RETRIES=10
KIBANA_RETRY_DELAY_MS=3000

# ==============================================================================
# 🔍 LOGGING & PERFORMANCE
# ==============================================================================
LOG_LEVEL=debug
LOG_FLUSH_INTERVAL=1000
LOG_FLUSH_BYTES=1

# ==============================================================================
# 🔐 JWT & SECURITY (MANDATORY)
# ==============================================================================
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-this-in-production
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# ==============================================================================
# 🛡️ RATE LIMITING
# ==============================================================================
RATE_LIMIT_MAX=100
RATE_LIMIT_TIME_WINDOW=60000

# ==============================================================================
# 🗄️ DATABASE
# ==============================================================================
DATABASE_URL=file:./ecommerce.db

# ==============================================================================
# 🌐 CORS
# ==============================================================================
CORS_ORIGIN=*
```

---

## 🚀 Core Server Settings

| Variable   | Default       | Description                                                                                     |
| :--------- | :------------ | :---------------------------------------------------------------------------------------------- |
| `NODE_ENV`  | `development` | The environment mode. Use `production` for ELK logging and `development` for pretty console logs. |
| `PORT`      | `3001`        | The port your API server will listen on.                                                        |
| `HOST`      | `localhost`   | The network interface to bind to. Use `0.0.0.0` for Docker environments.                         |

---

## 🔐 Security & Auth (Required)

| Variable              | Description                                                                 |
| :-------------------- | :-------------------------------------------------------------------------- |
| `JWT_SECRET`          | A high-entropy secret key for signing Access Tokens. Minimum 32 characters. |
| `JWT_REFRESH_SECRET` | A separate secret key for signing Refresh Tokens.                           |
| `JWT_EXPIRES_IN`      | Expiration time for access tokens (e.g., `15m`, `1h`).                      |
| `JWT_REFRESH_EXPIRES_IN`| Expiration time for refresh tokens (e.g., `7d`).                           |

---

## 📊 Elasticsearch Logging

| Variable                       | Default                  | Description                                                                           |
| :----------------------------- | :----------------------- | :------------------------------------------------------------------------------------ |
| `ENABLED_ELASTIC_LOGS`         | `true`                   | **Master Switch.** If `false`, logs are only printed to the standard console.         |
| `ELASTICSEARCH_URL`            | `http://localhost:9200`  | The connection endpoint for Elasticsearch.                                            |
| `ELASTIC_INDEX_PREFIX`         | `ecommerce-logs`         | The prefix for indices (e.g., `ecommerce-logs-2024-05-18`).                           |
| `PRETTY_LOGS`                  | `true`                   | If `false`, outputs raw JSON. **Must be false for Elasticsearch transport.**           |
| `ELASTICSEARCH_MAX_RETRIES`     | `15`                     | How many times the setup script polls ES on boot.                                     |
| `ELASTICSEARCH_RETRY_DELAY_MS` | `2000`                   | Delay between polling attempts.                                                       |

---

## 🎨 Kibana Orchestration

| Variable                | Default                 | Description                                                                    |
| :---------------------- | :---------------------- | :----------------------------------------------------------------------------- |
| `KIBANA_URL`            | `http://localhost:5601` | Needed for the automated Data View creation script.                            |
| `KIBANA_DATA_VIEW_TITLE`| `ecommerce-logs*`       | The pattern Kibana looks for to aggregate indices.                             |
| `KIBANA_TIME_FIELD`     | `@timestamp`            | The field used for timestamping in Discover.                                   |
| `KIBANA_MAX_RETRIES`    | `10`                    | Setup script polling attempts for Kibana.                                      |

---

## 🛡️ Traffic & Data

| Variable                 | Default               | Description                                                        |
| :----------------------- | :-------------------- | :----------------------------------------------------------------- |
| `RATE_LIMIT_MAX`         | `100`                 | Maximum requests per IP per minute.                                |
| `RATE_LIMIT_TIME_WINDOW` | `60000`               | The window size in milliseconds for rate limiting.                 |
| `DATABASE_URL`           | `file:./ecommerce.db` | The connection string for the SQLite/LibSQL database.              |
| `CORS_ORIGIN`            | `*`                   | Allowed CORS origins (security recommendation: restrict in production). |

---

[⬅️ Back to Main README](../README.md)
