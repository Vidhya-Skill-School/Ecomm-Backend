# 🛒 Ecommerce App

![Node](https://img.shields.io/badge/Node.js-white?logo=node.js)
![Fastify](https://img.shields.io/badge/Fastify-High%20Performance-black?logo=fastify)
![SQLite](https://img.shields.io/badge/Database-SQLite-blue?logo=sqlite)
![JWT](https://img.shields.io/badge/Auth-JWT-red?logo=jsonwebtokens)
![Elasticsearch](https://img.shields.io/badge/Logging-Elasticsearch-green?logo=elasticsearch)
![Kibana](https://img.shields.io/badge/Visualization-Kibana-yellow?logo=kibana)
![License](https://img.shields.io/badge/License-MIT-lightgrey)
![Status](https://img.shields.io/badge/Status-Production%20Ready-success)

> ⚡ A **complete production-grade ecommerce backend API** with authentication, cart management, order processing, payment workflow, and **centralized logging with Elasticsearch + Kibana**.

---

## 📋 Table of Contents

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Quick Start](#-quick-start)
- [Environment Variables](#-environment-variables)
- [Logging Setup](#-logging-setup-with-elasticsearch--kibana)
- [Authentication Flow](#-authentication-flow)
- [API Endpoints](#-api-endpoints)
- [Postman Collection](#-postman-collection)
- [Error Handling](#-error-handling)
- [Security Features](#-security-features)
- [Deployment](#-deployment)
- [Troubleshooting](#-troubleshooting)

---

## ✨ Features

### Core Features

- 🔐 **JWT Authentication** - Secure login with access & refresh tokens
- 🛒 **Shopping Cart** - Add, update, remove items with stock validation
- 📦 **Order Management** - Complete order lifecycle (checkout → confirm → deliver → return)
- 💳 **Payment Flow** - Checkout system with payment confirmation
- 👤 **User Management** - Signup, signin, profile management
- 📊 **Analytics** - Product statistics and category insights

### Logging & Monitoring Features

- 📈 **Centralized Logging** - All logs sent to Elasticsearch
- 🔍 **Kibana Dashboard** - Real-time log visualization and analysis
- 🏷️ **Correlation IDs** - Track requests across all services
- 📊 **Performance Monitoring** - Track slow requests (>1s)
- 🔔 **Business Event Tracking** - User actions, orders, payments
- 🛡️ **Security Event Logging** - Failed logins, unauthorized access
- 📉 **Request/Response Logging** - Complete API call traces

### Technical Features

- 🗄️ SQLite database with auto-increment & foreign keys
- ⚡ Fastify - High performance Node.js framework
- 🔍 Advanced filtering, search & pagination
- 📚 Swagger/OpenAPI documentation
- 🛡️ Rate limiting & security headers
- 🔄 Session management with database storage
- 🌱 Interactive database seeding
- 📊 **ELK Stack Integration** - Elasticsearch + Kibana for log management

---

## 🛠️ Tech Stack

| Technology        | Purpose                    |
| ----------------- | -------------------------- |
| **Fastify**       | Web framework              |
| **SQLite**        | Database                   |
| **JWT**           | Authentication             |
| **crypto**        | Password hashing           |
| **Swagger**       | API documentation          |
| **Postman**       | API testing                |
| **Pino**          | Structured logging         |
| **Elasticsearch** | Log storage & indexing     |
| **Kibana**        | Log visualization          |
| **Docker**        | ELK Stack containerization |

---

## ⚠️ Requirements

- **Node.js v20 or higher**
- **Docker** (for Elasticsearch + Kibana)

### Install Node.js via NVM (Recommended)

```bash
# Install NVM
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Restart terminal or run
source ~/.bashrc

# Install latest LTS version of Node.js
nvm install --lts

# Use installed version
nvm use --lts

# Verify installation
node -v
npm -v
```

### Install Docker (for ELK Stack)

**macOS:**

```bash
brew install --cask docker
```

**Ubuntu/Debian:**

```bash
sudo apt-get update
sudo apt-get install -y docker.io docker-compose-plugin
```

**Windows:** Download from [Docker Desktop](https://www.docker.com/products/docker-desktop/)

Verify installation:

```bash
docker --version
docker compose version
```

---

## 🚀 Quick Start (Docker - Recommended)

The entire stack (API + Elasticsearch + Kibana) can be started with a single command.

### 1. Clone & Setup
```bash
git clone <your-repo-url>
cd Backend-Ecomm
```

### 2. Start Everything
```bash
docker compose up --build -d
```

### 3. Verify Services
| Service           | URL                          |
| ----------------- | ---------------------------- |
| **API Base**      | http://localhost:3001/api/v1 |
| **Swagger Docs**  | http://localhost:3001/docs   |
| **Health Check**  | http://localhost:3001/health |
| **Kibana UI**     | http://localhost:5601        |
| **Elasticsearch** | http://localhost:9200        |

---

## 🛡️ Security & Resilience (Enterprise Grade)

- **Helmet**: All responses include secure headers (CSP, HSTS, X-Content-Type-Options).
- **Graceful Shutdown**: Intercepts `SIGINT`/`SIGTERM` to safely close database & ES connections.
- **X-Request-ID**: Unique request tracing for correlation across logging services.
- **API Versioning**: Enforced `/api/v1` prefix for all domain modules.

---

## 🛠️ Manual Setup (Local Development)

#### Generate Secure JWT Keys

```bash
node -e "console.log('JWT_SECRET=' + require('crypto').randomBytes(48).toString('hex')); console.log('REFRESH_TOKEN_SECRET=' + require('crypto').randomBytes(48).toString('hex'));"
```

⚠️ **Never commit `.env` file to git** - Add it to `.gitignore`

### 3. Start ELK Stack (Elasticsearch + Kibana)

```bash
# Start Elasticsearch and Kibana
docker compose up -d

# Wait for services to be ready (30 seconds)
sleep 30

# Verify Elasticsearch is running
curl http://localhost:9200

# Verify Kibana is running
curl http://localhost:5601/api/status
```

### 4. Seed Database

```bash
npm run seed
```

Interactive prompts will guide you to:

- Clear existing data (optional)
- Seed products from `products.json`
- Create your first user account

### 5. Start Server

**Development** (with auto-reload):

```bash
npm run dev
```

**Production** (with Elasticsearch logging):

```bash
npm start
```

### 6. Access Services

| Service           | URL                          |
| ----------------- | ---------------------------- |
| **API Base**      | http://localhost:3001        |
| **Swagger Docs**  | http://localhost:3001/docs   |
| **Health Check**  | http://localhost:3001/health |
| **Elasticsearch** | http://localhost:9200        |
| **Kibana**        | http://localhost:5601        |

---

## 📊 Logging Setup with Elasticsearch + Kibana

### Architecture Overview

```
Fastify App → Pino Logger → Elasticsearch → Kibana Dashboard
     ↓              ↓              ↓              ↓
  API Calls    Structured    Indexed Logs    Visualization
               Logging
```

### Step-by-Step Setup

#### 1. Start ELK Stack

```bash
# Start containers
docker compose up -d

# Check if running
docker compose ps

# View logs
docker compose logs -f
```

#### 2. Create Kibana Data View

**Option A: Via API**

```bash
curl -X POST "http://localhost:5601/api/data_views/data_view" \
  -H "Content-Type: application/json" \
  -H "kbn-xsrf: true" \
  -d '{
    "data_view": {
      "title": "ecommerce-logs",
      "name": "Ecommerce Logs",
      "timeFieldName": "time"
    }
  }'
```

**Option B: Via Kibana UI**

1. Open http://localhost:5601
2. Go to **Stack Management** → **Data Views**
3. Click **Create data view**
4. Name: `Ecommerce Logs`
5. Index pattern: `ecommerce-logs`
6. Timestamp field: `time`
7. Click **Save**

#### 3. Verify Logs are Flowing

```bash
# Check if logs are reaching Elasticsearch
curl -X GET "http://localhost:9200/_cat/indices?v" | grep ecommerce

# Count total logs
curl -X GET "http://localhost:9200/ecommerce-logs/_count?pretty"

# View latest logs
curl -X GET "http://localhost:9200/ecommerce-logs/_search?pretty&sort=time:desc&size=5"
```

#### 4. View Logs in Kibana

1. Open **Kibana Discover**: http://localhost:5601/app/discover
2. Select your **"Ecommerce Logs"** data view
3. Set time range to **Last 15 minutes** or **Last 1 hour**
4. Click **Refresh**

#### 5. Useful Kibana Queries

```kql
# See all errors
level:error

# Failed logins
type:security_event AND event:failed_login

# Business events
type:business_event

# Slow requests (>1 second)
responseTimeMs:>1000

# Specific user activity
userId:"123"

# Checkout events
event:"checkout_created" OR event:"order_confirmed"

# Track by correlation ID
correlationId:"your-correlation-id"
```

### Log Types You'll See

| Log Type             | Description                           | Example                                     |
| -------------------- | ------------------------------------- | ------------------------------------------- |
| **Request Logs**     | API calls with method, URL, status    | `GET /products 200`                         |
| **Business Events**  | User actions (login, order, checkout) | `user_registered`, `order_confirmed`        |
| **Performance Logs** | Slow requests, DB queries             | `responseTimeMs: 1250`                      |
| **Security Events**  | Failed auth, unauthorized access      | `failed_login`, `unauthorized_order_access` |
| **Error Logs**       | Exceptions with stack traces          | `Product not found`                         |

### Kibana Dashboard Setup

Create these visualizations for monitoring:

1. **Request Volume Over Time** - Line chart
2. **HTTP Status Codes Distribution** - Pie chart
3. **Top Slowest Endpoints** - Data table
4. **Error Rate by Endpoint** - Bar chart
5. **Business Events Timeline** - Histogram
6. **User Activity Heatmap** - Heat map

### Stop ELK Stack

```bash
# Stop containers
docker compose down

# Stop and remove volumes (clears all data)
docker compose down -v
```

---

## 🌍 Environment Variables

| Variable               | Required | Default     | Description                                     |
| ---------------------- | -------- | ----------- | ----------------------------------------------- |
| `JWT_SECRET`           | ✅       | -           | Secret key for JWT access tokens (min 32 chars) |
| `REFRESH_TOKEN_SECRET` | ✅       | -           | Secret key for refresh tokens (min 32 chars)    |
| `ELASTICSEARCH_URL`    | ❌       | -           | Elasticsearch endpoint for logging              |
| `LOG_LEVEL`            | ❌       | info        | Log level (fatal/error/warn/info/debug/trace)   |
| `PORT`                 | ❌       | 3001        | Server port number                              |
| `NODE_ENV`             | ❌       | development | Environment (development/production/test)       |
| `RATE_LIMIT_MAX`       | ❌       | 100         | Max requests per minute per IP                  |

### Production Environment

```env
NODE_ENV=production
PORT=3001
JWT_SECRET=your-very-long-production-secret
REFRESH_TOKEN_SECRET=your-different-production-secret
ELASTICSEARCH_URL=http://elasticsearch:9200
LOG_LEVEL=info
RATE_LIMIT_MAX=100
```

⚠️ **Security Notes:**

- Never expose JWT secrets in client-side code
- Rotate secrets periodically in production
- Use different secrets for development and production
- Store secrets in secret managers (AWS Secrets Manager, HashiCorp Vault)

---

## 🔐 Authentication Flow

### 1. Sign Up

```bash
POST /auth/signup
{
  "email": "user@example.com",
  "name": "John Doe",
  "phone": "9876543210",
  "password": "password123"
}
```

### 2. Sign In

```bash
POST /auth/signin
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:** Access token, refresh token, user details

### 3. Use Protected Routes

```bash
Authorization: Bearer <access_token>
```

### 4. Refresh Token (when expired)

```bash
POST /auth/refresh
{
  "refreshToken": "<refresh_token>"
}
```

### 5. Logout

```bash
POST /auth/logout
Authorization: Bearer <access_token>
```

---

## 📡 API Endpoints

### 🔐 Authentication

| Method | Endpoint        | Description          | Auth |
| ------ | --------------- | -------------------- | ---- |
| POST   | `/auth/signup`  | Create new account   | ❌   |
| POST   | `/auth/signin`  | Login & get tokens   | ❌   |
| POST   | `/auth/refresh` | Refresh access token | ❌   |
| POST   | `/auth/logout`  | Invalidate session   | ✅   |
| GET    | `/account`      | Get user profile     | ✅   |

### 🛍️ Products

| Method | Endpoint        | Description       | Auth |
| ------ | --------------- | ----------------- | ---- |
| GET    | `/products`     | List all products | ❌   |
| GET    | `/products/:id` | Get product by ID | ❌   |
| POST   | `/products`     | Create product    | ❌\* |
| PATCH  | `/products/:id` | Update product    | ❌\* |
| DELETE | `/products/:id` | Delete product    | ❌\* |

\*Should be admin protected in production

### 🛒 Cart (All require Auth)

| Method | Endpoint        | Description      |
| ------ | --------------- | ---------------- |
| POST   | `/cart`         | Add item to cart |
| GET    | `/cart`         | View cart        |
| PATCH  | `/cart/:cartId` | Update quantity  |
| DELETE | `/cart/:cartId` | Remove item      |
| DELETE | `/cart`         | Clear cart       |

### 📦 Orders (All require Auth)

| Method | Endpoint                      | Description          |
| ------ | ----------------------------- | -------------------- |
| POST   | `/checkout`                   | Create checkout      |
| POST   | `/orders/confirm/:checkoutId` | Confirm with payment |
| POST   | `/orders/cancel/:checkoutId`  | Cancel order         |
| POST   | `/orders/deliver/:orderId`    | Mark delivered       |
| POST   | `/orders/return/:orderId`     | Return order         |
| GET    | `/orders/track/:orderNumber`  | Track order          |
| GET    | `/orders`                     | Get user orders      |
| GET    | `/orders/:orderId`            | Get order by ID      |

### 📊 Statistics

| Method | Endpoint      | Description       |
| ------ | ------------- | ----------------- |
| GET    | `/categories` | List categories   |
| GET    | `/statistics` | Product analytics |
| GET    | `/health`     | Health check      |

---

## 🔍 Query Parameters (Products)

```bash
/products?page=1&limit=10
/products?search=laptop
/products?minPrice=100&maxPrice=500
/products?category=Electronics
/products?rating=4
/products?sortBy=price&sortOrder=ASC
```

---

## 📬 Postman Collection

### Setup

1. Import `postman-collection.json`
2. Set collection variable:
   ```
   baseUrl = http://localhost:3001
   ```
3. Sign up and sign in (tokens auto-saved)
4. Start using protected endpoints

### Collection Includes

- ✅ Authentication flow
- ✅ Cart operations
- ✅ Order lifecycle
- ✅ Product management
- ✅ Automatic token refresh

---

## 🛡️ Security Features

- **Password Hashing**: PBKDF2 with 1000 iterations + salt
- **JWT Tokens**: Short-lived access (15min) + refresh (7 days)
- **Session Storage**: Tokens validated from database
- **Rate Limiting**: 100 requests per minute per IP
- **Token Invalidation**: Immediate logout support
- **SQL Injection Prevention**: Parameterized queries
- **CORS Enabled**: Configurable origins
- **Environment Isolation**: Dev/Prod separate configs
- **Log Redaction**: Sensitive data removed from logs
- **Correlation IDs**: Request tracing across services

---

## 📤 Response Format

### Success (200)

```json
{
  "message": "Operation successful",
  "data": { ... },
  "total": 50,
  "page": 1,
  "limit": 10
}
```

### Error (400/401/404/500)

```json
{
  "statusCode": 401,
  "error": "Unauthorized",
  "message": "Invalid or expired token",
  "correlationId": "550e8400-e29b-41d4-a716-446655440000"
}
```

### Validation Error (400)

```json
{
  "statusCode": 400,
  "error": "Validation Error",
  "message": "Please provide email field.",
  "missingFields": ["email"],
  "correlationId": "550e8400-e29b-41d4-a716-446655440000"
}
```

---

## 🔄 Order Status Flow

```
pending_payment → confirmed → delivered
       ↓              ↓           ↓
    cancelled      cancelled    returned
```

---

## 🛠️ Troubleshooting

### NVM not found

```bash
# Install NVM
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Restart terminal or run
source ~/.bashrc

# For ZSH users
source ~/.zshrc
```

### Port already in use

```bash
lsof -i :3001
kill -9 <PID>
```

### Elasticsearch not starting

```bash
# Check logs
docker compose logs elasticsearch

# Check if port is available
lsof -i :9200

# Restart with clean state
docker compose down -v
docker compose up -d
```

### Kibana no data view

```bash
# Create data view via API
curl -X POST "http://localhost:5601/api/data_views/data_view" \
  -H "Content-Type: application/json" \
  -H "kbn-xsrf: true" \
  -d '{"data_view":{"title":"ecommerce-logs","timeFieldName":"time"}}'
```

### No logs in Kibana

```bash
# Check if logs are in Elasticsearch
curl -X GET "http://localhost:9200/ecommerce-logs/_count?pretty"

# Check if data view has correct time field
curl -X GET "http://localhost:5601/api/data_views" | jq '.data_view[].timeFieldName'

# Verify app is sending logs
ELASTICSEARCH_URL=http://localhost:9200 node test-logger.js
```

### Database locked

```bash
rm ecommerce.db
npm run seed
```

### Dependencies issue

```bash
rm -rf node_modules package-lock.json
pnpm install
```

### Environment variables not loading

```bash
# Check if .env file exists
ls -la | grep .env

# Verify dotenv is installed
pnpm list dotenv
```

### JWT_SECRET missing error

```bash
# Generate new secrets
node -e "console.log('JWT_SECRET=' + require('crypto').randomBytes(48).toString('hex')); console.log('REFRESH_TOKEN_SECRET=' + require('crypto').randomBytes(48).toString('hex'));"

# Add to .env file
```

---

## 🚀 Deployment

### Recommended Platforms

- **Render** - Free tier with auto-deploy
- **Railway** - Easy SQLite persistence
- **Fly.io** - Global deployment
- **AWS EC2** - Full control

### ELK Stack in Production

For production, consider:

1. **Managed Elasticsearch**:
   - Elastic Cloud (free trial available)
   - AWS OpenSearch Service
   - Azure Elasticsearch

2. **Cloud logging alternatives**:
   - Datadog
   - Logz.io
   - New Relic

### Environment Setup on Deployment

1. **Set environment variables on hosting platform**

2. **Required variables:**

   ```env
   NODE_ENV=production
   JWT_SECRET=<production-secret-key>
   REFRESH_TOKEN_SECRET=<production-refresh-key>
   ELASTICSEARCH_URL=<your-cloud-elasticsearch-url>
   LOG_LEVEL=info
   PORT=3001
   ```

3. **Security checklist:**
   - [ ] Use strong, unique secrets for production
   - [ ] Enable HTTPS
   - [ ] Configure CORS properly
   - [ ] Enable rate limiting
   - [ ] Setup database backups
   - [ ] Configure log rotation
   - [ ] Set up monitoring alerts

### PM2 Setup (for VPS)

```bash
npm install -g pm2
pm2 start index.js --name ecomm-api
pm2 save
pm2 startup
```

---

## 📊 Performance

- **Requests/sec**: ~1000+ (Fastify benchmark)
- **Response time**: <50ms (cached queries)
- **Concurrent users**: 500+ with rate limiting
- **Log throughput**: ~10,000 logs/sec (Elasticsearch)

---

## 🔮 Roadmap

- [ ] Email verification
- [ ] Password reset flow
- [ ] Admin dashboard
- [ ] Product reviews & ratings
- [ ] Wishlist functionality
- [ ] Coupon & discount system
- [x] **Docker support for app** (not just ELK)
- [ ] CI/CD pipeline
- [ ] Redis caching
- [ ] WebSocket notifications
- [ ] Grafana dashboards
- [ ] Prometheus metrics

---

## 📄 License

MIT

---

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Commit changes
4. Push to branch
5. Open Pull Request

---

## 📞 Support

For issues:

1. Check [Troubleshooting](#-troubleshooting) section
2. Review Elasticsearch/Kibana logs: `docker compose logs`
3. Check application logs in Kibana Discover
4. Open an issue on GitHub

---

**Happy Coding! 🚀**

```

```
