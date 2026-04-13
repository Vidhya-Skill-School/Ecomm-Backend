import { db } from "../db.js";

/**
 * Create user session
 */
async function createSession(userId, accessToken, refreshToken, userAgent, ip) {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

  await db.execute({
    sql: `
      INSERT INTO user_sessions (userId, accessToken, refreshToken, userAgent, ip, expiresAt)
      VALUES (?, ?, ?, ?, ?, ?)
    `,
    args: [
      userId,
      accessToken,
      refreshToken,
      userAgent,
      ip,
      expiresAt.toISOString(),
    ],
  });
}

/**
 * Validate access token from database
 */
async function validateAccessToken(accessToken) {
  const result = await db.execute({
    sql: `
      SELECT s.*, u.email, u.name 
      FROM user_sessions s
      JOIN users u ON s.userId = u.id
      WHERE s.accessToken = ? AND s.isActive = 1 AND s.expiresAt > datetime('now')
    `,
    args: [accessToken],
  });

  return result.rows[0] || null;
}

/**
 * Validate refresh token
 */
async function validateRefreshToken(refreshToken) {
  const result = await db.execute({
    sql: `
      SELECT s.*, u.email, u.name 
      FROM user_sessions s
      JOIN users u ON s.userId = u.id
      WHERE s.refreshToken = ? AND s.isActive = 1 AND s.expiresAt > datetime('now')
    `,
    args: [refreshToken],
  });

  return result.rows[0] || null;
}

/**
 * Update session tokens (for refresh)
 */
async function updateSessionTokens(
  oldAccessToken,
  newAccessToken,
  newRefreshToken,
) {
  await db.execute({
    sql: `
      UPDATE user_sessions 
      SET accessToken = ?, refreshToken = ?, updatedAt = CURRENT_TIMESTAMP
      WHERE accessToken = ?
    `,
    args: [newAccessToken, newRefreshToken, oldAccessToken],
  });
}

/**
 * Invalidate user session (logout)
 */
async function invalidateSession(accessToken) {
  await db.execute({
    sql: `
      UPDATE user_sessions 
      SET isActive = 0, updatedAt = CURRENT_TIMESTAMP
      WHERE accessToken = ?
    `,
    args: [accessToken],
  });
}

/**
 * Invalidate all user sessions (logout from all devices)
 */
async function invalidateAllUserSessions(userId) {
  await db.execute({
    sql: `
      UPDATE user_sessions 
      SET isActive = 0, updatedAt = CURRENT_TIMESTAMP
      WHERE userId = ?
    `,
    args: [userId],
  });
}

/**
 * Get user by email
 */
async function getUserByEmail(email) {
  const result = await db.execute({
    sql: "SELECT * FROM users WHERE email = ?",
    args: [email],
  });

  return result.rows[0] || null;
}

/**
 * Get user by ID
 */
async function getUserById(userId) {
  const result = await db.execute({
    sql: "SELECT id, email, name, phone, createdAt FROM users WHERE id = ?",
    args: [userId],
  });

  return result.rows[0] || null;
}

/**
 * Create new user
 */
async function createUser(email, name, phone, hashedPassword) {
  const result = await db.execute({
    sql: `
      INSERT INTO users (email, name, phone, password)
      VALUES (?, ?, ?, ?)
    `,
    args: [email, name, phone, hashedPassword],
  });

  return result.lastInsertRowid;
}

export {
  createSession,
  validateAccessToken,
  validateRefreshToken,
  updateSessionTokens,
  invalidateSession,
  invalidateAllUserSessions,
  getUserByEmail,
  getUserById,
  createUser,
};
