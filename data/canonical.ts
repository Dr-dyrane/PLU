import { catalog } from "@/data/catalog";
import aisles from "@/data/aisles.json";
import { pegTable } from "@/data/pegs";

/**
 * Canonical normalized data surface for the learning engine.
 *
 * Important:
 * - PLU codes are exact source lookups and are never inferred from appearance.
 * - `catalog` contains the 475 normalized source rows.
 * - legacy memory hooks from the workbook are not teaching canon; the v0.2
 *   learning engine will generate its own reversible encoding from the code.
 * - source flags such as handwritten / obscured / unverified remain available
 *   on catalog records so uncertain entries can be excluded from learner decks.
 */
export const canonicalData = {
  schemaVersion: "0.2.0",
  catalog,
  aisles,
  mnemonicPegs: pegTable,
} as const;

export type CanonicalData = typeof canonicalData;
