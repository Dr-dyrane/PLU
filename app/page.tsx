import { BatchHome } from "@/components/canon/BatchHome";
import { HomeFooter } from "@/components/canon/HomeFooter";
import { batch01 } from "@/data/batches";
import { productStories } from "@/data/stories";

export default function HomePage() {
  return (
    <>
      <BatchHome batch={batch01} stories={productStories} />
      <HomeFooter />
    </>
  );
}
