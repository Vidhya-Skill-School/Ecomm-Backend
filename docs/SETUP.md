# 🛠️ Installation & Setup Guide

This guide covers manual setup for developers who want to run the environment outside of standard Docker configurations.

## 📋 Requirements

* **Node.js:** v20 or higher
* **pnpm:** v9+
* **Docker:** Required only for running the ELK Stack (Elasticsearch/Kibana)

---

## 🟢 Node.js Setup Using NVM

Using a Node Version Manager ensures consistent environments across machines and avoids version conflicts.

### 🍎 macOS & 🐧 Linux (using nvm)

#### 1. Install NVM

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.nvm/nvm.sh
nvm install 24
nvm use 24
nvm alias default 20

# Verify NodeJS
node -v
npm -v
```

---

### 🪟 Windows (using nvm-windows)

> ⚠️ Note: This is a separate implementation from the macOS/Linux version.

#### 1. Install NVM for Windows

Download and install from:
[https://github.com/coreybutler/nvm-windows/releases](https://github.com/coreybutler/nvm-windows/releases)

#### 2. Install Node.js (v20+)

```bash
nvm install 24
nvm use 24
nvm alias default 20
```

---


---

## 🏗️ Local Installation

### 1. Install Dependencies

```bash
corepack enable pnpm
pnpm install
```

### 2. Configure Environment

Generate your secure JWT keys:

```bash
node -e "console.log('JWT_SECRET=' + require('crypto').randomBytes(48).toString('hex'))"
node -e "console.log('REFRESH_TOKEN_SECRET=' + require('crypto').randomBytes(48).toString('hex'))"
```

Copy `.env.example` to `.env` and configure accordingly.

> [!TIP]
> For a detailed list of what every variable does, see the [Environment Variable Guide](./ENVIRONMENT.md).

#### Understanding the Configuration Categories:

* **Server Config (`PORT`, `HOST`):** Defines the API's listener profile.
* **Logging Switch (`ENABLED_ELASTIC_LOGS`):** The master toggle. If `false`, logs go to stdout; if `true`, they stream to your ELK stack.
* **Infrastructure Polling (`MAX_RETRIES`, `DELAY`):** Dictates how aggressively the setup scripts retry connection to ES/Kibana on boot.
* **JWT Secrets:** Critical cryptographic keys. Use the generation commands above to ensure they are secure.

### 3. Database Initialization

```bash
pnpm run seed
```

This script will interactively allow you to clear the SQLite database and seed it with sample products from `products.json`.

---

## 🚀 Development Workflow

### Running the API

```bash
# Development mode (Hot Reload)
pnpm run dev

# Testing Elasticsearch connectivity manually
pnpm init:elasticsearch
pnpm init:kibana
```

### Running Tests

We use **Vitest** for extreme testing speed.

```bash
# Run all tests
pnpm test

# Run E2E tests only
pnpm run test:e2e
```

---

## 📤 Deployment Checklist

1. Ensure `NODE_ENV=production` is set.
2. Verify `JWT_SECRET` and `REFRESH_TOKEN_SECRET` are high-entropy keys.
3. Change `ELASTICSEARCH_URL` from `localhost` to the internal Docker network alias `http://ec-elastic-search:9200`.
4. Ensure `ENABLED_ELASTIC_LOGS=true` for production visibility.

---

[⬅️ Back to Main README](../README.md)

