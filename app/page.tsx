import "./styles/v02.css";
import "./styles/media.css";

import { TraceMediaShell } from "@/components/v02/TraceMediaShell";
import { TraceTrainer } from "@/components/v02/TraceTrainer";
import { greenPepperStory } from "@/data/stories";

export default function HomePage() {
  return (
    <TraceMediaShell story={greenPepperStory}>
      <TraceTrainer story={greenPepperStory} />
    </TraceMediaShell>
  );
}
