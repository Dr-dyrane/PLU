import { BatchHome } from "@/components/canon/BatchHome";
import { HomeFooter } from "@/components/canon/HomeFooter";
import { mustKnow200 } from "@/data/batches";
import { homeStorySummaries } from "@/data/stories";

export default function HomePage() {
  return (
    <>
      <BatchHome batch={mustKnow200} stories={homeStorySummaries} />
      <HomeFooter />
    </>
  );
}
