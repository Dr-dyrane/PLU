export const MUST_KNOW_WEIGHTS = {
  primaryLooseCheckoutItem: 30,
  commonSupermarketProduce: 25,
  soldByExplicitlyGiven: 15,
  belongsToConfusionFamily: 15,
  commonFamily: 10,
  usefulVisualDistinction: 10,
  packageOrBag: -15,
  caseOrInventoryRecord: -25,
  duplicateOrAlternateListing: -20,
  obscuredOrUncertain: -25,
  rareSpecialtyProduce: -10,
} as const;

export type MustKnowSignal = keyof typeof MUST_KNOW_WEIGHTS;
export type MustKnowSignals = Record<MustKnowSignal, boolean>;
export type MustKnowBand = "Essential" | "Common" | "Useful" | "Specialty" | "Reference";

export type MustKnowScoreResult = {
  score: number;
  rawScore: number;
  band: MustKnowBand;
  breakdown: Array<{
    signal: MustKnowSignal;
    points: number;
  }>;
};

export function classifyMustKnowScore(score: number): MustKnowBand {
  if (score >= 80) return "Essential";
  if (score >= 60) return "Common";
  if (score >= 40) return "Useful";
  if (score >= 20) return "Specialty";
  return "Reference";
}

export function calculateMustKnowScore(signals: MustKnowSignals): MustKnowScoreResult {
  const breakdown = (Object.entries(MUST_KNOW_WEIGHTS) as Array<
    [MustKnowSignal, number]
  >)
    .filter(([signal]) => signals[signal])
    .map(([signal, points]) => ({ signal, points }));
  const rawScore = breakdown.reduce((total, item) => total + item.points, 0);
  const score = Math.max(0, Math.min(100, rawScore));

  return {
    score,
    rawScore,
    band: classifyMustKnowScore(score),
    breakdown,
  };
}
