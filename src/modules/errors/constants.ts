import type { ErrorCode } from "./schema.js";

export const ERROR_MESSAGES: Record<ErrorCode, string> = {
  FETCH_ERROR: "Failed to fetch the URL",
  TIMEOUT_ERROR: "Request timed out",
  PARSE_ERROR: "Failed to parse page content",
  VALIDATION_ERROR: "Invalid input data",
  CONFIG_ERROR: "Invalid configuration",
  UNKNOWN_ERROR: "An unexpected error occurred",
};
