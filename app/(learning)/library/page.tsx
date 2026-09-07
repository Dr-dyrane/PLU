import { BatchHome } from "@/components/canon/BatchHome";
import { catalog475 } from "@/data/batches";
import { homeStorySummaries } from "@/data/stories";
import { relationshipSummaries } from "@/data/relationships";
import { referenceSummaries } from "@/data/references";

export const metadata = { title: "Library · PLU" };

export default function LibraryPage() {
  return <BatchHome mode="library" batch={catalog475} stories={homeStorySummaries} relationships={relationshipSummaries} references={referenceSummaries} />;
}
