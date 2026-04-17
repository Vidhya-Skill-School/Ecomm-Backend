import loggerService from "../../services/logger.js";
import { STATUS_CODES } from "../../shared/constants.js";
import { ForbiddenError, NotFoundError } from "../../shared/errors.js";

export const OrderController = {
  async checkout(req, reply) {
    const userId = req.user.id.toString();
    const { shippingAddress = null } = req.body;
    
    // Wrap in transaction for safety
    const checkout = await req.server.transaction(async (tx) => {
      return req.server.orderService.createCheckout(userId, shippingAddress, tx);
    });

    loggerService.logBusinessEvent(
      "checkout_created",
      { checkoutId: checkout.checkoutId, totalAmount: checkout.totalAmount },
      userId,
      req.correlationId,
    );

    return reply.code(STATUS_CODES.OK).send(checkout);
  },

  async confirm(req, reply) {
    const { checkoutId } = req.params;
    const { paymentId } = req.body;
    
    // ATOMIC Transaction: Confirm order + Deduct stock + Clear cart
    const order = await req.server.transaction(async (tx) => {
      return req.server.orderService.confirmOrder(checkoutId, paymentId, tx);
    });

    loggerService.logBusinessEvent(
      "order_confirmed",
      { checkoutId, paymentId, orderId: order.id, orderNumber: order.orderNumber },
      req.user.id,
      req.correlationId,
    );

    return reply.code(STATUS_CODES.OK).send(order);
  },

  async cancel(req, reply) {
    const { checkoutId } = req.params;
    const { reason = "Cancelled by user" } = req.body;
    
    // Transaction: Cancel order + Return stock
    const order = await req.server.transaction(async (tx) => {
      return req.server.orderService.cancelOrder(checkoutId, reason, tx);
    });

    loggerService.logBusinessEvent(
      "order_cancelled",
      { checkoutId, reason, orderId: order.id },
      req.user.id,
      req.correlationId,
    );

    return reply.code(STATUS_CODES.OK).send(order);
  },

  async deliver(req, reply) {
    const order = await req.server.transaction(async (tx) => {
      return req.server.orderService.deliverOrder(parseInt(req.params.orderId), tx);
    });

    loggerService.logBusinessEvent(
      "order_delivered",
      { orderId: parseInt(req.params.orderId), orderNumber: order.orderNumber },
      req.user.id,
      req.correlationId,
    );

    return reply.code(STATUS_CODES.OK).send(order);
  },

  async track(req, reply) {
    const order = await req.server.orderService.trackOrder(req.params.orderNumber);

    loggerService.logBusinessEvent(
      "order_tracked",
      { orderNumber: req.params.orderNumber },
      req.user?.id,
      req.correlationId,
    );

    return reply.code(STATUS_CODES.OK).send(order);
  },

  async return(req, reply) {
    const order = await req.server.transaction(async (tx) => {
      return req.server.orderService.returnOrder(parseInt(req.params.orderId), req.body.reason, tx);
    });

    loggerService.logBusinessEvent(
      "order_returned",
      { orderId: parseInt(req.params.orderId), reason: req.body.reason },
      req.user.id,
      req.correlationId,
    );

    return reply.code(STATUS_CODES.OK).send(order);
  },

  async getUserOrders(req) {
    const userId = req.user.id.toString();
    return req.server.orderService.getUserOrders(userId);
  },

  async getOrderById(req, reply) {
    const order = await req.server.orderService.getOrderById(parseInt(req.params.orderId));
    
    if (!order) {
      throw new NotFoundError("Order");
    }

    const userId = req.user.id.toString();
    if (order.sessionId !== userId) {
      loggerService.logSecurityEvent("unauthorized_order_access", userId, {
        orderId: req.params.orderId,
        orderOwnerId: order.sessionId,
      });
      throw new ForbiddenError("You do not have permission to view this order");
    }

    return reply.code(STATUS_CODES.OK).send(order);
  },
};
