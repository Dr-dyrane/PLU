import { catalog } from "@/data/catalog";
import aisles from "@/data/aisles.json";
import { pegTable } from "@/data/pegs";
import { productStories } from "@/data/stories";

/**
 * Single normalized runtime surface for the learning system.
 *
 * PLU codes remain exact catalog lookups. Product stories add curated identity,
 * checkout, provenance, variant, and confusion metadata without mutating the
 * underlying source rows. The workbook's old peg table is retained only as
 * legacy source material; TRACE does not depend on it.
 */
export const canonicalData = {
  schemaVersion: "0.2.0",
  catalog,
  aisles,
  stories: productStories,
  legacyMnemonicPegs: pegTable,
} as const;

export type CanonicalData = typeof canonicalData;
