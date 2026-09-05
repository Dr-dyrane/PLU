import { BatchHome } from "@/components/canon/BatchHome";
import { HomeFooter } from "@/components/canon/HomeFooter";
import { catalog475 } from "@/data/batches";
import { homeStorySummaries } from "@/data/stories";
import { relationshipSummaries } from "@/data/relationships";

export default function HomePage() {
  return (
    <>
      <BatchHome batch={catalog475} stories={homeStorySummaries} relationships={relationshipSummaries} />
      <HomeFooter />
    </>
  );
}
