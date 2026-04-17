import { 
  generateAccessToken, 
  generateRefreshToken, 
  hashPassword, 
  verifyPassword 
} from "../../services/jwt.js";
import { UnauthorizedError, ConflictError } from "../../shared/errors.js";

export class AuthService {
  constructor(db) {
    this.db = db;
  }

  async getUserByEmail(email) {
    const res = await this.db.execute({
      sql: "SELECT * FROM users WHERE email = ?",
      args: [email],
    });
    return res.rows[0] || null;
  }

  async getUserById(id) {
    const res = await this.db.execute({
      sql: "SELECT id, email, name, phone FROM users WHERE id = ?",
      args: [id],
    });
    return res.rows[0] || null;
  }

  async getUserByPhone(phone) {
    const res = await this.db.execute({
      sql: "SELECT id FROM users WHERE phone = ?",
      args: [phone],
    });
    return res.rows[0] || null;
  }

  async createUser(email, name, phone, password) {
    // Check for duplicate email
    const existingEmail = await this.getUserByEmail(email);
    if (existingEmail) {
      throw new ConflictError(`The email address "${email}" is already registered. Please use a different email or sign in.`);
    }

    // Check for duplicate phone
    const existingPhone = await this.getUserByPhone(phone);
    if (existingPhone) {
      throw new ConflictError(`The phone number "${phone}" is already registered. Please use a different phone number or sign in.`);
    }

    const hashedPassword = hashPassword(password);
    const res = await this.db.execute({
      sql: `
        INSERT INTO users (email, name, phone, password)
        VALUES (?, ?, ?, ?)
      `,
      args: [email, name, phone, hashedPassword],
    });
    return Number(res.lastInsertRowid);
  }

  async signIn(email, password, userAgent, ip) {
    const user = await this.getUserByEmail(email);
    if (!user || !verifyPassword(password, user.password)) {
      throw new UnauthorizedError("Invalid email or password");
    }

    const accessToken = generateAccessToken(user.id, user.email);
    const refreshToken = generateRefreshToken(user.id, user.email);

    // Create session
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now

    await this.db.execute({
      sql: `
        INSERT INTO user_sessions (userId, accessToken, refreshToken, userAgent, ip, expiresAt)
        VALUES (?, ?, ?, ?, ?, ?)
      `,
      args: [
        user.id,
        accessToken,
        refreshToken,
        userAgent,
        ip,
        expiresAt.toISOString(),
      ],
    });

    return {
      accessToken,
      refreshToken,
      user: { id: user.id, email: user.email, name: user.name },
    };
  }

  async logout(accessToken) {
    await this.db.execute({
      sql: "UPDATE user_sessions SET isActive = 0, updatedAt = CURRENT_TIMESTAMP WHERE accessToken = ?",
      args: [accessToken],
    });
  }

  async refreshTokens(refreshToken) {
    const res = await this.db.execute({
      sql: `
        SELECT us.*, u.email 
        FROM user_sessions us
        JOIN users u ON us.userId = u.id
        WHERE us.refreshToken = ? AND us.isActive = 1 AND us.expiresAt > CURRENT_TIMESTAMP
      `,
      args: [refreshToken],
    });

    const session = res.rows[0];
    if (!session) {
      throw new UnauthorizedError("Invalid or expired refresh token");
    }

    const newAccessToken = generateAccessToken(session.userId, session.email);
    const newRefreshToken = generateRefreshToken(session.userId, session.email);

    await this.db.execute({
      sql: `
        UPDATE user_sessions 
        SET accessToken = ?, refreshToken = ?, updatedAt = CURRENT_TIMESTAMP 
        WHERE refreshToken = ?
      `,
      args: [newAccessToken, newRefreshToken, refreshToken],
    });

    return { accessToken: newAccessToken, refreshToken: newRefreshToken };
  }

  async validateAccessToken(accessToken) {
    const result = await this.db.execute({
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
}
