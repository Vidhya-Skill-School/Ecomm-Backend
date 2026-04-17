import loggerService from "../../services/logger.js";
import { STATUS_CODES } from "../../shared/constants.js";

export const AuthController = {
  async getAccount(req, reply) {
    const userId = req.user.id;
    const user = await req.server.authService.getUserById(userId);

    if (!user) {
      const { NotFoundError } = await import("../../shared/errors.js");
      throw new NotFoundError("User");
    }

    loggerService.logBusinessEvent(
      "account_viewed",
      { userId },
      userId,
      req.correlationId,
    );
    return reply.code(STATUS_CODES.OK).send(user);
  },

  async signup(req, reply) {
    const { email, name, phone, password } = req.body;

    // AuthService now throws ConflictError if exists
    const userId = await req.server.authService.createUser(email, name, phone, password);
    const user = await req.server.authService.getUserById(userId);

    loggerService.logBusinessEvent(
      "user_registered",
      { userId, email, name },
      userId,
      req.correlationId,
    );

    return reply
      .code(STATUS_CODES.CREATED)
      .send({ message: "User registered successfully", data: user });
  },

  async signin(req, reply) {
    const { email, password } = req.body;
    
    // AuthService now throws UnauthorizedError if failed
    const result = await req.server.authService.signIn(
      email,
      password,
      req.headers["user-agent"] || "unknown",
      req.ip,
    );

    loggerService.logBusinessEvent(
      "user_logged_in",
      { userId: result.user.id, email: result.user.email },
      result.user.id,
      req.correlationId,
    );

    return reply.code(STATUS_CODES.OK).send({
      message: "Login successful",
      ...result,
    });
  },

  async refresh(req, reply) {
    const { refreshToken } = req.body;
    
    // AuthService now throws UnauthorizedError if failed
    const result = await req.server.authService.refreshTokens(refreshToken);

    return reply.code(STATUS_CODES.OK).send(result);
  },

  async logout(req, reply) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      await req.server.authService.logout(token);

      if (req.user?.id) {
        loggerService.logBusinessEvent(
          "user_logged_out",
          { userId: req.user.id },
          req.user.id,
          req.correlationId,
        );
      }
    }

    return reply.code(STATUS_CODES.OK).send({ message: "Logged out successfully" });
  },
};
