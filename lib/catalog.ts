import { catalog } from "@/data/catalog";
import type { CatalogItem } from "@/types/plu";

export { catalog };

export function findCatalogItem(item: string, code: string): CatalogItem {
  const match = catalog.find(
    (record) => record.item === item && record.codes.includes(code),
  );

  if (!match) {
    throw new Error(`Catalog record not found: ${item} → ${code}`);
  }

  return match;
}
