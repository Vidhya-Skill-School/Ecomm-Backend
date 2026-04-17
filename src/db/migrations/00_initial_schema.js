export async function up({ context: db }) {
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
}

export async function down({ context: db }) {
  await db.execute("DROP TABLE IF EXISTS order_status_history");
  await db.execute("DROP TABLE IF EXISTS orders");
  await db.execute("DROP TABLE IF EXISTS cart");
  await db.execute("DROP TABLE IF EXISTS products");
  await db.execute("DROP TABLE IF EXISTS user_sessions");
  await db.execute("DROP TABLE IF EXISTS users");
}
