import { BatchHome } from "@/components/canon/BatchHome";
import { HomeFooter } from "@/components/canon/HomeFooter";
import { batch05 } from "@/data/batches";
import { homeStorySummaries } from "@/data/stories";

export default function Batch05Page() {
  return (
    <>
      <BatchHome batch={batch05} stories={homeStorySummaries} />
      <HomeFooter />
    </>
  );
}
