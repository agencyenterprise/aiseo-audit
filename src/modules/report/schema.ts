import { z } from "zod";

export const ReportFormatSchema = z.enum(["pretty", "json", "md", "html"]);

export const RenderOptionsSchema = z.object({
  format: ReportFormatSchema.default("pretty"),
  tldrOnly: z.boolean().optional(),
});

export type ReportFormatType = z.infer<typeof ReportFormatSchema>;
export type RenderOptionsType = z.infer<typeof RenderOptionsSchema>;
