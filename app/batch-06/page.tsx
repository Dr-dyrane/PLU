import { BatchHome } from "@/components/canon/BatchHome";
import { HomeFooter } from "@/components/canon/HomeFooter";
import { batch06 } from "@/data/batches";
import { homeStorySummaries } from "@/data/stories";

export default function Batch06Page() {
  return (
    <>
      <BatchHome batch={batch06} stories={homeStorySummaries} />
      <HomeFooter />
    </>
  );
}
