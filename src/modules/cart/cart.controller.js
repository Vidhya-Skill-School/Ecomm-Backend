import loggerService from "../../services/logger.js";
import { STATUS_CODES } from "../../shared/constants.js";

export const CartController = {
  async getCart(req) {
    const userId = req.user.id.toString();
    return req.server.cartService.getCart(userId);
  },

  async addToCart(req, reply) {
    const userId = req.user.id.toString();
    const { productId, quantity = 1 } = req.body;

    // CartService now handles stock validation and throws BadRequestError if insufficient
    const cart = await req.server.cartService.addToCart(userId, productId, quantity);

    loggerService.logBusinessEvent(
      "cart_item_added",
      { productId, quantity, cartTotal: cart.total },
      userId,
      req.correlationId,
    );

    return reply.code(STATUS_CODES.OK).send(cart);
  },

  async updateCartItem(req, reply) {
    const userId = req.user.id.toString();
    
    // CartService now handles item existence and throws NotFoundError if missing
    const cart = await req.server.cartService.updateCartItem(
      userId,
      parseInt(req.params.cartId),
      req.body.quantity,
    );

    loggerService.logBusinessEvent(
      "cart_item_updated",
      { cartId: req.params.cartId, quantity: req.body.quantity },
      userId,
      req.correlationId,
    );

    return reply.code(STATUS_CODES.OK).send(cart);
  },

  async removeFromCart(req, reply) {
    const userId = req.user.id.toString();
    const cart = await req.server.cartService.removeFromCart(
      userId,
      parseInt(req.params.cartId),
    );

    loggerService.logBusinessEvent(
      "cart_item_removed",
      { cartId: req.params.cartId },
      userId,
      req.correlationId,
    );

    return reply.code(STATUS_CODES.OK).send(cart);
  },

  async clearCart(req, reply) {
    const userId = req.user.id.toString();
    const cart = await req.server.cartService.clearCart(userId);

    loggerService.logBusinessEvent(
      "cart_cleared",
      {},
      userId,
      req.correlationId,
    );

    return reply.code(STATUS_CODES.OK).send(cart);
  },
};
