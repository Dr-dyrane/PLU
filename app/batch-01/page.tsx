import { BatchHome } from "@/components/canon/BatchHome";
import { batch01 } from "@/data/batches";
import { productStories } from "@/data/stories";

export default function Batch01Page() {
  return <BatchHome batch={batch01} stories={productStories} />;
}
