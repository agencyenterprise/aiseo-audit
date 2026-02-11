import { z } from 'zod';

export const ReportFormatSchema = z.enum(['pretty', 'json', 'md']);

export const RenderOptionsSchema = z.object({
  format: ReportFormatSchema.default('pretty'),
});

export type ReportFormat = z.infer<typeof ReportFormatSchema>;
export type RenderOptions = z.infer<typeof RenderOptionsSchema>;
