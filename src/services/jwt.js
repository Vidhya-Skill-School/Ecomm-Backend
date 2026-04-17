import jwt from "jsonwebtoken";
import crypto from "crypto";
import { env } from "../config/env.js";

const JWT_SECRET = env.JWT_SECRET;
const REFRESH_TOKEN_SECRET = env.JWT_REFRESH_SECRET;
const JWT_EXPIRY = env.JWT_EXPIRES_IN;
const REFRESH_TOKEN_EXPIRY = env.JWT_REFRESH_EXPIRES_IN;

/**
 * Generate access token
 */
function generateAccessToken(userId, email) {
  return jwt.sign({ userId, email }, JWT_SECRET, { expiresIn: JWT_EXPIRY });
}

/**
 * Generate refresh token
 */
function generateRefreshToken(userId, email) {
  return jwt.sign({ userId, email, type: "refresh" }, REFRESH_TOKEN_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRY,
  });
}

/**
 * Verify access token
 */
function verifyAccessToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    console.log("Access token verification failed:", error.message);
    return null;
  }
}

/**
 * Verify refresh token
 */
function verifyRefreshToken(token) {
  try {
    return jwt.verify(token, REFRESH_TOKEN_SECRET);
  } catch (error) {
    console.log("Refresh token verification failed:", error.message);
    return null;
  }
}

/**
 * Hash password using crypto
 */
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto
    .pbkdf2Sync(password, salt, 1000, 64, "sha512")
    .toString("hex");
  return `${salt}:${hash}`;
}

/**
 * Verify password
 */
function verifyPassword(password, storedHash) {
  const [salt, hash] = storedHash.split(":");
  const hashVerify = crypto
    .pbkdf2Sync(password, salt, 1000, 64, "sha512")
    .toString("hex");
  return hash === hashVerify;
}

export {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  hashPassword,
  verifyPassword,
  JWT_SECRET,
  REFRESH_TOKEN_SECRET,
};
