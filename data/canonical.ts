import aisles from "@/data/aisles.json";
import { batch01, batch02, batch03, mustKnow50, mustKnow100 } from "@/data/batches";
import { catalog } from "@/data/catalog";
import { pegTable } from "@/data/pegs";
import { productStories } from "@/data/stories";

/**
 * Single normalized runtime surface for the learning system.
 * Codes remain exact catalog lookups. Stories and batches layer teaching
 * structure over source rows without mutating them.
 */
export const canonicalData = {
  schemaVersion: "0.6.0",
  catalog,
  aisles,
  batches: [batch01, batch02, batch03],
  collections: [mustKnow50, mustKnow100],
  stories: productStories,
  legacyMnemonicPegs: pegTable,
} as const;

export type CanonicalData = typeof canonicalData;
