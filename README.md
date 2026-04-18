# 🛒 E-Commerce Backend (Enterprise Edition)

![Node](https://img.shields.io/badge/Node.js-v20+-white?logo=node.js)
![Fastify](https://img.shields.io/badge/Fastify-v5-black?logo=fastify)
![pnpm](https://img.shields.io/badge/package--manager-pnpm-orange?logo=pnpm)
![Docker](https://img.shields.io/badge/Container-Docker-2496ED?logo=docker)
![Status](https://img.shields.io/badge/Status-Production%20Ready-success)

> ⚡ A **high-performance production-grade ecommerce backend** built with Fastify v5, ES2025 standards, and automated ELK logging.

---

## 📖 documentation Index

We use a modular documentation system for rapid reference:

-   [🚀 **Step-by-Step Installation**](./docs/SETUP.md) — Manual & Docker setup.
-   [🌍 **Environment Variables**](./docs/ENVIRONMENT.md) — Full configuration guide.
-   [📊 **Logging & Monitoring**](./docs/LOGGING.md) — ELK stack setup and usage.
-   [🛰️ **API Reference**](./docs/API.md) — Auth flow and Endpoint mapping.

---

## 🛠️ Prerequisite Installation

Before starting, ensure you have the core tools installed on your host machine.

### 1. Docker (Required for ELK)

* **macOS:**
  `brew install --cask docker`
  Or download Docker Desktop from: (or download [Docker Desktop](https://www.docker.com/products/docker-desktop/))

* **Ubuntu:**
  `sudo apt install docker.io docker-compose`

* **Windows (Windows 10/11 Pro, Enterprise, Education):**

  * Download and install Docker Desktop
  * Enable **WSL 2 (Windows Subsystem for Linux)** when prompted
  * Restart your system after installation
  * Ensure Docker Desktop is running

* **Windows (if WSL 2 is not installed):**

  * Run:

    ```powershell
    wsl --install
    ```
  * Then install Docker Desktop and select **WSL 2 backend**

---

### Quick Notes

* Ensure **virtualization is enabled** in BIOS
* Windows Home requires **WSL 2**
* Verify installation:

  ```bash
  docker --version
  docker compose version
  ```


### 2. Node.js & pnpm
*   **Node.js v20+:** `nvm install 20 && nvm use 20`
*   **pnpm:** `corepack enable pnpm`
```bash
pnpm install
```

---

## Setup .env file (create .env file in root directory)

```bash
NODE_ENV=development
PORT=3001
HOST=localhost
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-this-in-production
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
DATABASE_URL=file:./ecommerce.db
```
#  


## 🚀 Quick Start (Docker)

```bash
# Boot the entire Cloud-Grade Stack
docker compose up --build -d
```

| Service | URL |
| :--- | :--- |
| **API Base** | [http://localhost:3001/api/v1](http://localhost:3001/api/v1) |
| **Swagger UI** | [http://localhost:3001/docs](http://localhost:3001/docs) |
| **Kibana UI** | [http://localhost:5601](http://localhost:5601) |

---

## 🐳 Docker Management Operations

The following commands are essential for managing your containerized infrastructure.

| Action                           | Command                                          |
| :------------------------------- | :----------------------------------------------- |
| **Start Services**               | `docker compose up -d`                           |
| **Stop Services**                | `docker compose stop`                            |
| **Shutdown & Remove Containers** | `docker compose down`                            |
| **Reboot (Clear Data)**          | `docker compose down -v && docker compose up -d` |
| **Check Health**                 | `docker compose ps`                              |
| **View App Logs**                | `docker logs -f EC-Backend-App`                  |
| **Force Termination**            | `docker compose kill`                            |
| **Pause Execution**              | `docker compose pause`                           |


---

## ⚙️ Configuration Preview
The application behavior is driven by the `.env` file. For a deep dive into what each variable does, check the link below.

[👉 View Full Environment variable Guide](./docs/ENVIRONMENT.md)

---

[🛠️ Go to Detailed Setup](./docs/SETUP.md) | [📞 Report an Issue](https://github.com/your-repo/issues) | MIT © 2024
