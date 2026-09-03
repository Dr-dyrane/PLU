import { PluLesson } from "@/components/canon/PluLesson";
import { greenPepperStory } from "@/data/stories";
import { productTheme } from "@/lib/ui/product-theme";

export default function HomePage() {
  return (
    <div className="productTheme" style={productTheme(greenPepperStory)}>
      <PluLesson story={greenPepperStory} />
    </div>
  );
}
