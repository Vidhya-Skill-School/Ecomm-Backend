# 🛰️ API Reference & Authentication

This document outlines the authentication flow and the available REST endpoints for the E-Commerce API.

## 🔐 Authentication Flow

We use a **Dual-Token System** (JWT) for secure session management.

1.  **Signup:** Create a new identity via `POST /auth/signup`.
2.  **Signin:** Authenticate via `POST /auth/signin` to receive:
    *   `accessToken`: Short-lived (15 min) for API calls.
    *   `refreshToken`: Long-lived (7 days) to get new access tokens.
3.  **Usage:** Include `Authorization: Bearer <accessToken>` in headers for protected routes.
4.  **Refresh:** When the access token expires, hit `POST /auth/refresh` with your `refreshToken`.

---

## 📡 Primary Endpoints

### Authentication
| Method | Endpoint | Description | Auth |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/auth/signup` | Register new user | ❌ |
| `POST` | `/api/v1/auth/signin` | Login & receive tokens | ❌ |
| `POST` | `/api/v1/auth/refresh` | Refresh access token | ❌ |
| `GET` | `/api/v1/account` | Get authenticated profile | ✅ |

### Products
| Method | Endpoint | Description | Filters |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/products` | List all products | `search`, `category`, `minPrice` |
| `GET` | `/api/v1/products/:id` | Get specific product | - |
| `POST` | `/api/v1/products` | Create new product | Admin Only |

### Shopping Cart (Auth Required)
- `GET /api/v1/cart`: View current items.
- `POST /api/v1/cart`: Add/Update items.
- `DELETE /api/v1/cart/:id`: Remove item.

### Orders & Checkout (Auth Required)
- `POST /api/v1/checkout`: Step 1: Create a pending order.
- `POST /api/v1/orders/confirm/:id`: Step 2: Finalize order (payment simulation).
- `GET /api/v1/orders/track/:orderNum`: Track status.

---

## 📤 Global Response Format

### Success (200 OK)
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation completed"
}
```

### Error (400/401/500)
```json
{
  "success": false,
  "error": {
    "code": "FST_ERR_VALIDATION",
    "message": "Detailed error message"
  },
  "correlationId": "550e8400-e29b-41d4-a716-446655440000"
}
```

---

[⬅️ Back to Main README](../README.md)
