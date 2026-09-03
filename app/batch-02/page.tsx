import { BatchHome } from "@/components/canon/BatchHome";
import { HomeFooter } from "@/components/canon/HomeFooter";
import { batch02 } from "@/data/batches";
import { productStories } from "@/data/stories";

export default function Batch02Page() {
  return (
    <>
      <BatchHome batch={batch02} stories={productStories} />
      <HomeFooter />
    </>
  );
}
