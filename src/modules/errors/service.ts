import { AxiosError } from "axios";
import { ZodError } from "zod";
import { ERROR_MESSAGES } from "./constants.js";
import type { NormalizedErrorType } from "./schema.js";

export function normalizeError(error: unknown): NormalizedErrorType {
  if (error instanceof AxiosError) {
    if (error.code === "ECONNABORTED" || error.code === "ETIMEDOUT") {
      return {
        code: "TIMEOUT_ERROR",
        message: "Request timed out - the page took too long to respond",
        details: { originalCode: error.code },
      };
    }

    const status = error.response?.status;
    if (status === 403) {
      return {
        code: "FETCH_ERROR",
        message:
          "Access forbidden (403) - the site is blocking automated requests",
        details: { statusCode: status },
      };
    }
    if (status === 404) {
      return {
        code: "FETCH_ERROR",
        message: "Page not found (404) - check that the URL is correct",
        details: { statusCode: status },
      };
    }
    if (status && status >= 400) {
      return {
        code: "FETCH_ERROR",
        message: `HTTP ${status}: Page returned an error`,
        details: { statusCode: status },
      };
    }

    if (error.code === "ECONNREFUSED") {
      return {
        code: "FETCH_ERROR",
        message:
          "Connection refused - the server may be down or blocking requests",
        details: { originalCode: error.code },
      };
    }

    if (error.code === "ENOTFOUND") {
      return {
        code: "FETCH_ERROR",
        message: "DNS lookup failed - check that the domain is correct",
        details: { originalCode: error.code },
      };
    }

    return {
      code: "FETCH_ERROR",
      message: `${ERROR_MESSAGES.FETCH_ERROR}: ${error.message}`,
      details: { originalCode: error.code },
    };
  }

  if (error instanceof ZodError) {
    return {
      code: "VALIDATION_ERROR",
      message: `${ERROR_MESSAGES.VALIDATION_ERROR}: ${error.issues.map((i) => i.message).join(", ")}`,
      details: { issues: error.issues },
    };
  }

  if (error instanceof Error) {
    return {
      code: "UNKNOWN_ERROR",
      message: error.message,
    };
  }

  return {
    code: "UNKNOWN_ERROR",
    message: String(error),
  };
}
