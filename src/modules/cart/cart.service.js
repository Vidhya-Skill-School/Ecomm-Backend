import { NotFoundError, BadRequestError } from "../../shared/errors.js";

export class CartService {
  constructor(db, productService) {
    this.db = db;
    this.productService = productService;
  }

  async getCart(sessionId) {
    const cart = await this.db.execute({
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

  async addToCart(sessionId, productId, quantity = 1) {
    const product = await this.productService.getProductById(productId);
    if (!product) throw new NotFoundError("Product");
    if (product.stock < quantity) throw new BadRequestError("Insufficient stock");

    const existing = await this.db.execute({
      sql: "SELECT * FROM cart WHERE sessionId = ? AND productId = ?",
      args: [sessionId, productId],
    });

    if (existing.rows.length > 0) {
      const newQuantity = existing.rows[0].quantity + quantity;
      if (product.stock < newQuantity) throw new BadRequestError("Insufficient stock");

      await this.db.execute({
        sql: `
          UPDATE cart 
          SET quantity = ?, updatedAt = CURRENT_TIMESTAMP 
          WHERE sessionId = ? AND productId = ?
        `,
        args: [newQuantity, sessionId, productId],
      });
    } else {
      await this.db.execute({
        sql: `
          INSERT INTO cart (sessionId, productId, quantity)
          VALUES (?, ?, ?)
        `,
        args: [sessionId, productId, quantity],
      });
    }

    return this.getCart(sessionId);
  }

  async updateCartItem(sessionId, cartItemId, quantity) {
    if (quantity < 0) throw new BadRequestError("Quantity cannot be negative");

    const cartItem = await this.db.execute({
      sql: "SELECT * FROM cart WHERE id = ? AND sessionId = ?",
      args: [cartItemId, sessionId],
    });

    if (cartItem.rows.length === 0) throw new NotFoundError("Cart item");

    if (quantity === 0) {
      await this.db.execute({
        sql: "DELETE FROM cart WHERE id = ? AND sessionId = ?",
        args: [cartItemId, sessionId],
      });
      return this.getCart(sessionId);
    }

    const productId = cartItem.rows[0].productId;
    const product = await this.productService.getProductById(productId);
    if (!product) throw new NotFoundError("Product");
    if (product.stock < quantity) throw new BadRequestError("Insufficient stock");

    await this.db.execute({
      sql: `
        UPDATE cart 
        SET quantity = ?, updatedAt = CURRENT_TIMESTAMP 
        WHERE id = ? AND sessionId = ?
      `,
      args: [quantity, cartItemId, sessionId],
    });

    return this.getCart(sessionId);
  }

  async removeFromCart(sessionId, cartItemId) {
    const res = await this.db.execute({
      sql: "DELETE FROM cart WHERE id = ? AND sessionId = ?",
      args: [cartItemId, sessionId],
    });

    if (res.rowsAffected === 0) {
      throw new NotFoundError("Cart item");
    }

    return this.getCart(sessionId);
  }

  async clearCart(sessionId, tx = this.db) {
    await tx.execute({
      sql: "DELETE FROM cart WHERE sessionId = ?",
      args: [sessionId],
    });
    return { items: [], total: 0, itemCount: 0, totalQuantity: 0 };
  }
}
