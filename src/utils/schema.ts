import { z } from "zod";

const HttpRequestOptionsSchema = z.object({
  url: z.string(),
  timeout: z.number(),
  userAgent: z.string(),
});

export const HttpResponseSchema = z.object({
  status: z.number(),
  data: z.string(),
  headers: z.record(z.string(), z.string()),
  finalUrl: z.string(),
});

export type HttpRequestOptionsType = z.infer<typeof HttpRequestOptionsSchema>;
export type HttpResponseType = z.infer<typeof HttpResponseSchema>;
