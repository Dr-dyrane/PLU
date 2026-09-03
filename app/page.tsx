import { PluLesson } from "@/components/canon/PluLesson";
import { greenPepperStory } from "@/data/stories";

export default function HomePage() {
  return <PluLesson story={greenPepperStory} />;
}
