import { NotFoundError, BadRequestError } from "../../shared/errors.js";

export class OrderService {
  constructor(db, cartService, productService) {
    this.db = db;
    this.cartService = cartService;
    this.productService = productService;
  }

  async generateOrderNumber() {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000);
    return `ORD-${timestamp}-${random}`;
  }

  /**
   * Create a checkout (pending order)
   */
  async createCheckout(sessionId, shippingAddress = null, tx = this.db) {
    const cart = await this.cartService.getCart(sessionId);
    if (cart.items.length === 0) throw new BadRequestError("Cart is empty");

    // Verify stock before creating checkout
    for (const item of cart.items) {
      const product = await this.productService.getProductById(item.productId);
      if (!product || product.stock < item.quantity) {
        throw new BadRequestError(`Insufficient stock for product: ${product?.title || "Unknown"}`);
      }
    }

    const orderNumber = await this.generateOrderNumber();
    const checkoutId = `CHK-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;

    await tx.execute({
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

    const orderRes = await tx.execute({
      sql: "SELECT * FROM orders WHERE checkoutId = ?",
      args: [checkoutId],
    });
    const order = orderRes.rows[0];

    await this.addOrderStatusHistory(order.id, "pending_payment", "Checkout created", tx);

    return {
      orderId: order.id,
      orderNumber,
      checkoutId,
      totalAmount: cart.total,
      items: cart.items,
      status: "pending_payment",
    };
  }

  /**
   * Confirm order payment and deduct stock (Atomic Transaction recommended)
   */
  async confirmOrder(checkoutId, paymentId, tx = this.db) {
    const orderRes = await tx.execute({
      sql: "SELECT * FROM orders WHERE checkoutId = ?",
      args: [checkoutId],
    });

    if (orderRes.rows.length === 0) throw new NotFoundError("Order");
    const orderData = orderRes.rows[0];

    if (orderData.status !== "pending_payment") {
      throw new BadRequestError(`Order cannot be confirmed. Current status: ${orderData.status}`);
    }

    // 1. Update order status
    await tx.execute({
      sql: `
        UPDATE orders 
        SET paymentId = ?, status = 'confirmed', updatedAt = CURRENT_TIMESTAMP
        WHERE checkoutId = ?
      `,
      args: [paymentId, checkoutId],
    });

    // 2. Deduct stock for each item
    const items = JSON.parse(orderData.items);
    for (const item of items) {
      const stockRes = await tx.execute({
        sql: "UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?",
        args: [item.quantity, item.productId, item.quantity],
      });
      
      if (stockRes.rowsAffected === 0) {
        throw new BadRequestError(`Failed to deduct stock for product ID: ${item.productId}. It may have gone out of stock.`);
      }
    }

    // 3. Clear cart
    await this.cartService.clearCart(orderData.sessionId, tx);
    
    // 4. Record history
    await this.addOrderStatusHistory(orderData.id, "confirmed", `Payment confirmed: ${paymentId}`, tx);

    return this.getOrderByCheckoutId(checkoutId, tx);
  }

  async cancelOrder(checkoutId, reason = "Cancelled by user", tx = this.db) {
    const orderRes = await tx.execute({
      sql: "SELECT * FROM orders WHERE checkoutId = ?",
      args: [checkoutId],
    });

    if (orderRes.rows.length === 0) throw new NotFoundError("Order");
    const orderData = orderRes.rows[0];

    if (orderData.status === "delivered") throw new BadRequestError("Delivered orders cannot be cancelled");
    if (orderData.status === "cancelled") throw new BadRequestError("Order is already cancelled");

    await tx.execute({
      sql: "UPDATE orders SET status = 'cancelled', updatedAt = CURRENT_TIMESTAMP WHERE checkoutId = ?",
      args: [checkoutId],
    });

    // Return stock if it was already confirmed
    if (orderData.status === "confirmed" || orderData.status === "processing") {
      const items = JSON.parse(orderData.items);
      for (const item of items) {
        await tx.execute({
          sql: "UPDATE products SET stock = stock + ? WHERE id = ?",
          args: [item.quantity, item.productId],
        });
      }
    }

    await this.addOrderStatusHistory(orderData.id, "cancelled", reason, tx);
    return this.getOrderByCheckoutId(checkoutId, tx);
  }

  async deliverOrder(orderId, tx = this.db) {
    const order = await this.getOrderById(orderId, tx);
    if (!order) throw new NotFoundError("Order");

    if (order.status !== "confirmed" && order.status !== "processing") {
      throw new BadRequestError(`Order cannot be delivered. Current status: ${order.status}`);
    }

    await tx.execute({
      sql: "UPDATE orders SET status = 'delivered', updatedAt = CURRENT_TIMESTAMP WHERE id = ?",
      args: [orderId],
    });

    await this.addOrderStatusHistory(orderId, "delivered", "Order delivered successfully", tx);
    return this.getOrderById(orderId, tx);
  }

  async trackOrder(orderNumber) {
    const orderRes = await this.db.execute({
      sql: "SELECT * FROM orders WHERE orderNumber = ?",
      args: [orderNumber],
    });

    if (orderRes.rows.length === 0) throw new NotFoundError("Order");
    const orderData = orderRes.rows[0];

    const historyRes = await this.db.execute({
      sql: "SELECT status, notes, createdAt FROM order_status_history WHERE orderId = ? ORDER BY createdAt DESC",
      args: [orderData.id],
    });

    return {
      ...orderData,
      items: JSON.parse(orderData.items),
      statusHistory: historyRes.rows,
    };
  }

  async returnOrder(orderId, reason, tx = this.db) {
    const order = await this.getOrderById(orderId, tx);
    if (!order) throw new NotFoundError("Order");

    if (order.status !== "delivered") {
      throw new BadRequestError(`Only delivered orders can be returned. Current status: ${order.status}`);
    }

    await tx.execute({
      sql: "UPDATE orders SET status = 'returned', updatedAt = CURRENT_TIMESTAMP WHERE id = ?",
      args: [orderId],
    });

    const items = order.items;
    for (const item of items) {
      await tx.execute({
        sql: "UPDATE products SET stock = stock + ? WHERE id = ?",
        args: [item.quantity, item.productId],
      });
    }

    await this.addOrderStatusHistory(orderId, "returned", reason, tx);
    return this.getOrderById(orderId, tx);
  }

  async getOrderById(orderId, tx = this.db) {
    const res = await tx.execute({
      sql: "SELECT * FROM orders WHERE id = ?",
      args: [orderId],
    });
    if (res.rows.length === 0) return null;
    const order = res.rows[0];
    return { ...order, items: JSON.parse(order.items) };
  }

  async getOrderByCheckoutId(checkoutId, tx = this.db) {
    const res = await tx.execute({
      sql: "SELECT * FROM orders WHERE checkoutId = ?",
      args: [checkoutId],
    });
    if (res.rows.length === 0) return null;
    const order = res.rows[0];
    return { ...order, items: JSON.parse(order.items) };
  }

  async getUserOrders(sessionId) {
    const res = await this.db.execute({
      sql: "SELECT * FROM orders WHERE sessionId = ? ORDER BY createdAt DESC",
      args: [sessionId],
    });
    return res.rows.map(order => ({ ...order, items: JSON.parse(order.items) }));
  }

  async addOrderStatusHistory(orderId, status, notes = null, tx = this.db) {
    await tx.execute({
      sql: "INSERT INTO order_status_history (orderId, status, notes) VALUES (?, ?, ?)",
      args: [orderId, status, notes],
    });
  }
}
