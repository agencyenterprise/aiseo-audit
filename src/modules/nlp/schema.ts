import { z } from "zod";

export const ExtractedEntitiesSchema = z.object({
  people: z.array(z.string()),
  organizations: z.array(z.string()),
  places: z.array(z.string()),
  topics: z.array(z.string()),
  imperativeVerbCount: z.number().optional(),
  numberCount: z.number().optional(),
});

export type ExtractedEntitiesType = z.infer<typeof ExtractedEntitiesSchema>;
