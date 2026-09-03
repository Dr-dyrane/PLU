import { BatchHome } from "@/components/canon/BatchHome";
import { HomeFooter } from "@/components/canon/HomeFooter";
import { batch02 } from "@/data/batches";
import { homeStorySummaries } from "@/data/stories";

export default function Batch02Page() {
  return (
    <>
      <BatchHome batch={batch02} stories={homeStorySummaries} />
      <HomeFooter />
    </>
  );
}
