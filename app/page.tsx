import "./styles/v02.css";

import { TraceTrainer } from "@/components/v02/TraceTrainer";
import { greenPepperStory } from "@/data/stories";

export default function HomePage() {
  return <TraceTrainer story={greenPepperStory} />;
}
