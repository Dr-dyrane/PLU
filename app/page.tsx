import { PluTrainer } from "@/components/PluTrainer";
import { lessons } from "@/data/lessons";

export default function HomePage() {
  return <PluTrainer lesson={lessons[0]} />;
}
