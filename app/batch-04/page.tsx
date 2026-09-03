import { BatchHome } from "@/components/canon/BatchHome";
import { HomeFooter } from "@/components/canon/HomeFooter";
import { batch04 } from "@/data/batches";
import { homeStorySummaries } from "@/data/stories";

export default function Batch04Page() {
  return (
    <>
      <BatchHome batch={batch04} stories={homeStorySummaries} />
      <HomeFooter />
    </>
  );
}
