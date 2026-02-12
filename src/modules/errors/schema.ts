import { z } from "zod";

export const ErrorCodeSchema = z.enum([
  "FETCH_ERROR",
  "TIMEOUT_ERROR",
  "PARSE_ERROR",
  "VALIDATION_ERROR",
  "CONFIG_ERROR",
  "UNKNOWN_ERROR",
]);

export const NormalizedErrorSchema = z.object({
  code: ErrorCodeSchema,
  message: z.string(),
  details: z.record(z.unknown()).optional(),
});

export type ErrorCodeType = z.infer<typeof ErrorCodeSchema>;
export type NormalizedErrorType = z.infer<typeof NormalizedErrorSchema>;
