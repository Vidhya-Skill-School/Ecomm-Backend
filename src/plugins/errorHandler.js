import fp from "fastify-plugin";
import { STATUS_CODES } from "../shared/constants.js";
import { AppError } from "../shared/errors.js";

async function errorHandlerPlugin(fastify, _opts) {
  fastify.setErrorHandler((error, req, reply) => {
    // Debug logging for testing
    if (process.env.NODE_ENV === "test") {
      console.error("DEBUG - Error caught in handler:", {
        name: error.name,
        code: error.code,
        message: error.message,
        statusCode: error.statusCode,
        isOperational: error.isOperational,
        validation: !!error.validation,
      });
    }

    let statusCode = error.statusCode || STATUS_CODES.INTERNAL_SERVER_ERROR;
    let errorCode = error.code || "INTERNAL_SERVER_ERROR";
    let message = error.message;
    let details = error.details || null;

    // 1. Handle our custom AppErrors (check both instance and properties for resilience)
    if (error instanceof AppError || error.isOperational) {
      statusCode = error.statusCode || statusCode;
      errorCode = error.code || errorCode;
      message = error.message || message;
    }
    // 2. Handle Fastify validation errors
    else if (error.validation) {
      statusCode = STATUS_CODES.BAD_REQUEST;
      errorCode = "VALIDATION_ERROR";

      const missingFields = error.validation
        .filter((v) => v.keyword === "required")
        .map((v) => v.params.missingProperty);

      const fieldErrors = error.validation
        .filter((v) => v.keyword !== "required")
        .map((v) => ({
          field: v.instancePath.replace(/^\//, "") || "unknown",
          issue: v.message,
        }));

      message = missingFields.length > 0
        ? `Missing required fields: ${missingFields.join(", ")}`
        : "Validation failed";

      details = {
        missingFields: missingFields.length > 0 ? missingFields : undefined,
        fieldErrors: fieldErrors.length > 0 ? fieldErrors : undefined,
      };
    }

    // 3. Log the error
    const logMethod = statusCode >= 500 ? "error" : "warn";
    req.log[logMethod](
      {
        err: {
          name: error.name,
          message: error.message,
          stack: statusCode >= 500 ? error.stack : undefined,
          code: errorCode,
        },
        url: req.url,
        method: req.method,
        correlationId: req.correlationId,
      },
      `Request error: ${message}`,
    );

    // 4. Send standardized response
    const isInternal = statusCode === STATUS_CODES.INTERNAL_SERVER_ERROR;

    reply.status(statusCode).send({
      success: false,
      error: {
        code: errorCode,
        message: (isInternal && process.env.NODE_ENV !== "test")
          ? "An unexpected error occurred. Please try again later."
          : message,
        ...(details && { details }),
      },
      correlationId: req.correlationId,
    });
  });

  fastify.setNotFoundHandler((req, reply) => {
    reply.status(STATUS_CODES.NOT_FOUND).send({
      code: "NOT_FOUND",
      message: `Route ${req.method} ${req.url} not found`,
    });
  });
}

export default fp(errorHandlerPlugin);
