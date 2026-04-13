const { createClient } = require("@libsql/client");
const path = require("path");

// Use in-memory database for tests, file-based for development
const isTest = process.env.NODE_ENV === "test";

const db = createClient({
  url: isTest
    ? "file::memory:"
    : "file:" + path.join(__dirname, "ecommerce.db"),
});

/**
 * Initialize database with all tables
 */
async function initializeDatabase() {
  try {
    // Users table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        phone TEXT NOT NULL,
        password TEXT NOT NULL,
        isActive BOOLEAN DEFAULT 1,
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
        updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // User sessions table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS user_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId INTEGER NOT NULL,
        accessToken TEXT NOT NULL,
        refreshToken TEXT NOT NULL,
        userAgent TEXT,
        ip TEXT,
        isActive BOOLEAN DEFAULT 1,
        expiresAt TEXT NOT NULL,
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
        updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Products table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        price REAL NOT NULL,
        category TEXT NOT NULL,
        rating REAL DEFAULT 0,
        stock INTEGER DEFAULT 0,
        brand TEXT NOT NULL,
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
        updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Cart table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS cart (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        productId INTEGER NOT NULL,
        quantity INTEGER NOT NULL DEFAULT 1,
        sessionId TEXT NOT NULL,
        addedAt TEXT DEFAULT CURRENT_TIMESTAMP,
        updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (productId) REFERENCES products(id) ON DELETE CASCADE,
        UNIQUE(sessionId, productId)
      )
    `);

    // Orders table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        orderNumber TEXT UNIQUE NOT NULL,
        sessionId TEXT NOT NULL,
        checkoutId TEXT UNIQUE,
        paymentId TEXT,
        status TEXT DEFAULT 'pending',
        totalAmount REAL NOT NULL,
        items TEXT NOT NULL,
        shippingAddress TEXT,
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
        updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Order status history table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS order_status_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        orderId INTEGER NOT NULL,
        status TEXT NOT NULL,
        notes TEXT,
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (orderId) REFERENCES orders(id) ON DELETE CASCADE
      )
    `);

    // Create indexes for better performance
    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_sessions_accessToken ON user_sessions(accessToken);
      CREATE INDEX IF NOT EXISTS idx_sessions_refreshToken ON user_sessions(refreshToken);
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_cart_sessionId ON cart(sessionId);
      CREATE INDEX IF NOT EXISTS idx_orders_sessionId ON orders(sessionId);
      CREATE INDEX IF NOT EXISTS idx_orders_checkoutId ON orders(checkoutId);
    `);

    if (isTest) {
      console.log("Test database initialized successfully");
    }
  } catch (error) {
    console.error("Database initialization failed:", error);
    throw error;
  }
}

/* ==================== CART FUNCTIONS ==================== */

/**
 * Add item to cart
 */
async function addToCart(sessionId, productId, quantity = 1) {
  // Check if product exists and has enough stock
  const product = await getProductById(productId);
  if (!product) throw new Error("Product not found");
  if (product.stock < quantity) throw new Error("Insufficient stock");

  // Check if item already in cart
  const existing = await db.execute({
    sql: "SELECT * FROM cart WHERE sessionId = ? AND productId = ?",
    args: [sessionId, productId],
  });

  if (existing.rows.length > 0) {
    // Update quantity
    const newQuantity = existing.rows[0].quantity + quantity;
    if (product.stock < newQuantity) throw new Error("Insufficient stock");

    await db.execute({
      sql: `
        UPDATE cart 
        SET quantity = ?, updatedAt = CURRENT_TIMESTAMP 
        WHERE sessionId = ? AND productId = ?
      `,
      args: [newQuantity, sessionId, productId],
    });
  } else {
    // Insert new cart item
    await db.execute({
      sql: `
        INSERT INTO cart (sessionId, productId, quantity)
        VALUES (?, ?, ?)
      `,
      args: [sessionId, productId, quantity],
    });
  }

  return getCart(sessionId);
}

/**
 * Get cart contents
 */
async function getCart(sessionId) {
  const cart = await db.execute({
    sql: `
      SELECT 
        c.id,
        c.productId,
        c.quantity,
        c.addedAt,
        p.title,
        p.price,
        p.stock,
        p.category,
        p.brand,
        (p.price * c.quantity) as subtotal
      FROM cart c
      JOIN products p ON c.productId = p.id
      WHERE c.sessionId = ?
      ORDER BY c.addedAt DESC
    `,
    args: [sessionId],
  });

  const items = cart.rows;
  const total = items.reduce((sum, item) => sum + (item.subtotal || 0), 0);

  return {
    items,
    total,
    itemCount: items.length,
    totalQuantity: items.reduce((sum, item) => sum + item.quantity, 0),
  };
}

/**
 * Update cart item quantity
 */
async function updateCartItem(sessionId, cartItemId, quantity) {
  if (quantity < 0) throw new Error("Quantity cannot be negative");

  // Get cart item
  const cartItem = await db.execute({
    sql: "SELECT * FROM cart WHERE id = ? AND sessionId = ?",
    args: [cartItemId, sessionId],
  });

  if (cartItem.rows.length === 0) throw new Error("Cart item not found");

  if (quantity === 0) {
    // Remove item
    await db.execute({
      sql: "DELETE FROM cart WHERE id = ? AND sessionId = ?",
      args: [cartItemId, sessionId],
    });
    return getCart(sessionId);
  }

  const productId = cartItem.rows[0].productId;
  const product = await getProductById(productId);
  if (!product) throw new Error("Product not found");
  if (product.stock < quantity) throw new Error("Insufficient stock");

  await db.execute({
    sql: `
      UPDATE cart 
      SET quantity = ?, updatedAt = CURRENT_TIMESTAMP 
      WHERE id = ? AND sessionId = ?
    `,
    args: [quantity, cartItemId, sessionId],
  });

  return getCart(sessionId);
}

/**
 * Remove item from cart
 */
async function removeFromCart(sessionId, id = null, removeAll = false) {
  if (removeAll) {
    await db.execute({
      sql: "DELETE FROM cart WHERE sessionId = ?",
      args: [sessionId],
    });
  } else if (id) {
    await db.execute({
      sql: "DELETE FROM cart WHERE id = ? AND sessionId = ?",
      args: [id, sessionId],
    });
  } else {
    throw new Error("Either id or removeAll must be specified");
  }

  return getCart(sessionId);
}

/**
 * Clear entire cart
 */
async function clearCart(sessionId) {
  await db.execute({
    sql: "DELETE FROM cart WHERE sessionId = ?",
    args: [sessionId],
  });
  return getCart(sessionId);
}

/* ==================== ORDER FUNCTIONS ==================== */

/**
 * Generate unique order number
 */
async function generateOrderNumber() {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);
  return `ORD-${timestamp}-${random}`;
}

/**
 * Create checkout (prepare order for payment)
 */
async function createCheckout(sessionId, shippingAddress = null) {
  const cart = await getCart(sessionId);
  if (cart.items.length === 0) throw new Error("Cart is empty");

  for (const item of cart.items) {
    const product = await getProductById(item.productId);
    if (product.stock < item.quantity) {
      throw new Error(`Insufficient stock for product: ${product.title}`);
    }
  }

  const orderNumber = await generateOrderNumber();
  const checkoutId = `CHK-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;

  await db.execute({
    sql: `
      INSERT INTO orders 
      (orderNumber, sessionId, checkoutId, status, totalAmount, items, shippingAddress)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
    args: [
      orderNumber,
      sessionId,
      checkoutId,
      "pending_payment",
      cart.total,
      JSON.stringify(cart.items),
      shippingAddress,
    ],
  });

  const order = await db.execute({
    sql: "SELECT * FROM orders WHERE checkoutId = ?",
    args: [checkoutId],
  });

  await addOrderStatusHistory(
    order.rows[0].id,
    "pending_payment",
    "Checkout created",
  );

  return {
    orderId: order.rows[0].id,
    orderNumber,
    checkoutId,
    totalAmount: cart.total,
    items: cart.items,
    status: "pending_payment",
  };
}

/**
 * Confirm order after payment
 */
async function confirmOrder(checkoutId, paymentId) {
  const order = await db.execute({
    sql: "SELECT * FROM orders WHERE checkoutId = ?",
    args: [checkoutId],
  });

  if (order.rows.length === 0) throw new Error("Order not found");
  const orderData = order.rows[0];

  if (orderData.status !== "pending_payment") {
    throw new Error(
      `Order cannot be confirmed. Current status: ${orderData.status}`,
    );
  }

  await db.execute({
    sql: `
      UPDATE orders 
      SET paymentId = ?, status = 'confirmed', updatedAt = CURRENT_TIMESTAMP
      WHERE checkoutId = ?
    `,
    args: [paymentId, checkoutId],
  });

  const items = JSON.parse(orderData.items);
  for (const item of items) {
    await db.execute({
      sql: "UPDATE products SET stock = stock - ? WHERE id = ?",
      args: [item.quantity, item.productId],
    });
  }

  await clearCart(orderData.sessionId);
  await addOrderStatusHistory(
    orderData.id,
    "confirmed",
    `Payment confirmed: ${paymentId}`,
  );

  return getOrderByCheckoutId(checkoutId);
}

/**
 * Cancel order
 */
async function cancelOrder(checkoutId, reason = "Cancelled by user") {
  const order = await db.execute({
    sql: "SELECT * FROM orders WHERE checkoutId = ?",
    args: [checkoutId],
  });

  if (order.rows.length === 0) throw new Error("Order not found");
  const orderData = order.rows[0];

  if (orderData.status === "delivered") {
    throw new Error("Delivered orders cannot be cancelled");
  }
  if (orderData.status === "cancelled") {
    throw new Error("Order is already cancelled");
  }

  await db.execute({
    sql: `
      UPDATE orders 
      SET status = 'cancelled', updatedAt = CURRENT_TIMESTAMP
      WHERE checkoutId = ?
    `,
    args: [checkoutId],
  });

  if (orderData.status === "confirmed" || orderData.status === "processing") {
    const items = JSON.parse(orderData.items);
    for (const item of items) {
      await db.execute({
        sql: "UPDATE products SET stock = stock + ? WHERE id = ?",
        args: [item.quantity, item.productId],
      });
    }
  }

  await addOrderStatusHistory(orderData.id, "cancelled", reason);
  return getOrderByCheckoutId(checkoutId);
}

/**
 * Deliver order
 */
async function deliverOrder(orderId) {
  const order = await db.execute({
    sql: "SELECT * FROM orders WHERE id = ?",
    args: [orderId],
  });

  if (order.rows.length === 0) throw new Error("Order not found");
  const orderData = order.rows[0];

  if (orderData.status !== "confirmed" && orderData.status !== "processing") {
    throw new Error(
      `Order cannot be delivered. Current status: ${orderData.status}`,
    );
  }

  await db.execute({
    sql: `
      UPDATE orders 
      SET status = 'delivered', updatedAt = CURRENT_TIMESTAMP
      WHERE id = ?
    `,
    args: [orderId],
  });

  await addOrderStatusHistory(
    orderId,
    "delivered",
    "Order delivered successfully",
  );
  return getOrderById(orderId);
}

/**
 * Track order
 */
async function trackOrder(orderNumber) {
  const order = await db.execute({
    sql: `
      SELECT 
        id,
        orderNumber,
        status,
        totalAmount,
        items,
        shippingAddress,
        createdAt,
        updatedAt,
        paymentId
      FROM orders 
      WHERE orderNumber = ?
    `,
    args: [orderNumber],
  });

  if (order.rows.length === 0) throw new Error("Order not found");

  const orderData = order.rows[0];
  const history = await db.execute({
    sql: `
      SELECT status, notes, createdAt
      FROM order_status_history
      WHERE orderId = ?
      ORDER BY createdAt DESC
    `,
    args: [orderData.id],
  });

  return {
    ...orderData,
    items: JSON.parse(orderData.items),
    statusHistory: history.rows,
  };
}

/**
 * Return order
 */
async function returnOrder(orderId, reason) {
  const order = await db.execute({
    sql: "SELECT * FROM orders WHERE id = ?",
    args: [orderId],
  });

  if (order.rows.length === 0) throw new Error("Order not found");
  const orderData = order.rows[0];

  if (orderData.status !== "delivered") {
    throw new Error(
      `Only delivered orders can be returned. Current status: ${orderData.status}`,
    );
  }

  await db.execute({
    sql: `
      UPDATE orders 
      SET status = 'returned', updatedAt = CURRENT_TIMESTAMP
      WHERE id = ?
    `,
    args: [orderId],
  });

  const items = JSON.parse(orderData.items);
  for (const item of items) {
    await db.execute({
      sql: "UPDATE products SET stock = stock + ? WHERE id = ?",
      args: [item.quantity, item.productId],
    });
  }

  await addOrderStatusHistory(orderId, "returned", reason);
  return getOrderById(orderId);
}

/**
 * Get order by ID
 */
async function getOrderById(orderId) {
  const order = await db.execute({
    sql: "SELECT * FROM orders WHERE id = ?",
    args: [orderId],
  });

  if (order.rows.length === 0) return null;

  const orderData = order.rows[0];
  return {
    ...orderData,
    items: JSON.parse(orderData.items),
  };
}

/**
 * Get order by checkout ID
 */
async function getOrderByCheckoutId(checkoutId) {
  const order = await db.execute({
    sql: "SELECT * FROM orders WHERE checkoutId = ?",
    args: [checkoutId],
  });

  if (order.rows.length === 0) return null;

  const orderData = order.rows[0];
  return {
    ...orderData,
    items: JSON.parse(orderData.items),
  };
}

/**
 * Get user orders
 */
async function getUserOrders(sessionId) {
  const orders = await db.execute({
    sql: `
      SELECT 
        id,
        orderNumber,
        status,
        totalAmount,
        items,
        createdAt,
        updatedAt,
        paymentId
      FROM orders 
      WHERE sessionId = ?
      ORDER BY createdAt DESC
    `,
    args: [sessionId],
  });

  return orders.rows.map((order) => ({
    ...order,
    items: JSON.parse(order.items),
  }));
}

/**
 * Add order status history
 */
async function addOrderStatusHistory(orderId, status, notes = null) {
  await db.execute({
    sql: `
      INSERT INTO order_status_history (orderId, status, notes)
      VALUES (?, ?, ?)
    `,
    args: [orderId, status, notes],
  });
}

/* ==================== PRODUCT FUNCTIONS ==================== */

/**
 * Get products with filters
 */
async function getProducts(opts = {}) {
  const {
    page = 1,
    limit = 10,
    category,
    minPrice,
    maxPrice,
    rating,
    search,
    sortBy = "createdAt",
    sortOrder = "DESC",
  } = opts;

  let query = "SELECT * FROM products WHERE 1=1";
  let params = [];

  if (category) {
    query += " AND category = ?";
    params.push(category);
  }

  if (minPrice != null) {
    query += " AND price >= ?";
    params.push(parseFloat(minPrice));
  }

  if (maxPrice != null) {
    query += " AND price <= ?";
    params.push(parseFloat(maxPrice));
  }

  if (rating != null) {
    query += " AND rating >= ?";
    params.push(parseFloat(rating));
  }

  if (search) {
    query += " AND (title LIKE ? OR description LIKE ?)";
    const s = `%${search}%`;
    params.push(s, s);
  }

  const countRes = await db.execute({
    sql: query.replace("SELECT *", "SELECT COUNT(*) as total"),
    args: params,
  });

  const total = countRes.rows[0].total;

  const validSort = ["id", "title", "price", "rating", "stock", "createdAt"];
  const field = validSort.includes(sortBy) ? sortBy : "createdAt";
  const order = sortOrder === "ASC" ? "ASC" : "DESC";

  query += ` ORDER BY ${field} ${order} LIMIT ? OFFSET ?`;
  params.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));

  const res = await db.execute({ sql: query, args: params });

  return {
    total,
    page: parseInt(page),
    limit: parseInt(limit),
    data: res.rows,
  };
}

/**
 * Get product by ID
 */
async function getProductById(id) {
  const res = await db.execute({
    sql: "SELECT * FROM products WHERE id = ?",
    args: [id],
  });

  return res.rows[0] || null;
}

/**
 * Create product
 */
async function createProduct(data) {
  const {
    title,
    description,
    price,
    category,
    rating = 0,
    stock = 0,
    brand,
  } = data;

  const res = await db.execute({
    sql: `
      INSERT INTO products 
      (title, description, price, category, rating, stock, brand, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `,
    args: [title, description, price, category, rating, stock, brand],
  });

  return { id: Number(res.lastInsertRowid), ...data };
}

/**
 * Update product
 */
async function updateProduct(id, data) {
  const existing = await getProductById(id);
  if (!existing) return null;

  const fields = [];
  const values = [];

  for (const key in data) {
    fields.push(`${key} = ?`);
    values.push(data[key]);
  }

  if (fields.length === 0) {
    return existing;
  }

  fields.push("updatedAt = CURRENT_TIMESTAMP");
  values.push(id);

  await db.execute({
    sql: `UPDATE products SET ${fields.join(", ")} WHERE id = ?`,
    args: values,
  });

  return await getProductById(id);
}

/**
 * Delete product
 */
async function deleteProduct(id) {
  const product = await getProductById(id);
  if (!product) return null;

  await db.execute({
    sql: "DELETE FROM products WHERE id = ?",
    args: [id],
  });

  return product;
}

/**
 * Get categories
 */
async function getCategories() {
  const res = await db.execute(
    "SELECT DISTINCT category FROM products ORDER BY category",
  );
  return res.rows.map((r) => r.category);
}

/**
 * Get statistics
 */
async function getStatistics() {
  const res = await db.execute(`
    SELECT
      COUNT(*) as totalProducts,
      COUNT(DISTINCT category) as totalCategories,
      COUNT(DISTINCT brand) as totalBrands,
      AVG(price) as avgPrice,
      MIN(price) as minPrice,
      MAX(price) as maxPrice,
      AVG(rating) as avgRating,
      SUM(stock) as totalStock
    FROM products
  `);

  return res.rows[0];
}

/**
 * Clear products
 */
async function clearProducts() {
  await db.execute("DELETE FROM products");
}

/**
 * Bulk insert (transaction)
 */
async function bulkInsertProducts(products) {
  const tx = await db.transaction();

  try {
    for (const p of products) {
      await tx.execute({
        sql: `
          INSERT INTO products
          (title, description, price, category, rating, stock, brand, createdAt, updatedAt)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        args: [
          p.title,
          p.description,
          p.price,
          p.category,
          p.rating,
          p.stock,
          p.brand,
          p.createdAt,
          new Date().toISOString(),
        ],
      });
    }
    await tx.commit();
  } catch (err) {
    await tx.rollback();
    throw err;
  }
}

module.exports = {
  db,
  initializeDatabase,
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getCategories,
  clearProducts,
  bulkInsertProducts,
  getStatistics,
  addToCart,
  getCart,
  updateCartItem,
  removeFromCart,
  clearCart,
  createCheckout,
  confirmOrder,
  cancelOrder,
  deliverOrder,
  trackOrder,
  returnOrder,
  getUserOrders,
  getOrderById,
  getOrderByCheckoutId,
};
