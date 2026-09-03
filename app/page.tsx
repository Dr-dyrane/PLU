import { BatchHome } from "@/components/canon/BatchHome";
import { HomeFooter } from "@/components/canon/HomeFooter";
import { mustKnow300 } from "@/data/batches";
import { homeStorySummaries } from "@/data/stories";

export default function HomePage() {
  return (
    <>
      <BatchHome batch={mustKnow300} stories={homeStorySummaries} />
      <HomeFooter />
    </>
  );
}
