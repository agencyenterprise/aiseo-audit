import type { CategoryWeightType, EngineProfileType } from "./schema.js";

type WeightMultipliersType = Partial<Record<keyof CategoryWeightType, number>>;

const ENGINE_WEIGHT_MULTIPLIERS: Record<
  EngineProfileType,
  WeightMultipliersType
> = {
  generic: {},
  gemini: {
    contentStructure: 1.3,
    groundingSignals: 1.1,
  },
  gpt: {
    groundingSignals: 1.3,
    authorityContext: 1.2,
  },
  perplexity: {
    structuralAlignment: 1.2,
    authorityContext: 1.2,
  },
};

export function applyEnginePreset(
  weights: CategoryWeightType,
  engine: EngineProfileType,
): CategoryWeightType {
  const multipliers = ENGINE_WEIGHT_MULTIPLIERS[engine];
  const adjusted = { ...weights };
  for (const [category, multiplier] of Object.entries(multipliers)) {
    const key = category as keyof CategoryWeightType;
    adjusted[key] = adjusted[key] * (multiplier as number);
  }
  return adjusted;
}
