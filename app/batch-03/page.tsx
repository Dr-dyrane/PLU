import { BatchHome } from "@/components/canon/BatchHome";
import { HomeFooter } from "@/components/canon/HomeFooter";
import { batch03 } from "@/data/batches";
import { productStories } from "@/data/stories";

export default function Batch03Page() {
  return (
    <>
      <BatchHome batch={batch03} stories={productStories} />
      <HomeFooter />
    </>
  );
}
