import {
  Bookmark,
  Droplet,
  PackageOpen,
  Salad,
  Scale,
  Shapes,
  ShoppingBag,
  Volume2,
  VolumeX,
  X,
  type LucideIcon,
} from "lucide-react";

import type { ClassificationChoice, ClassificationPrompt } from "@/types/trace";

export type CanonIconName =
  | "bell"
  | "color"
  | "scale"
  | "bag"
  | "loose"
  | "bookmark"
  | "sound"
  | "muted"
  | "close";

const icons: Record<CanonIconName, LucideIcon> = {
  bell: Shapes,
  color: Droplet,
  scale: Scale,
  bag: ShoppingBag,
  loose: Salad,
  bookmark: Bookmark,
  sound: Volume2,
  muted: VolumeX,
  close: X,
};

export function Icon({ name }: { name: CanonIconName }) {
  const Glyph = icons[name];
  return <Glyph aria-hidden="true" strokeWidth={1.9} />;
}

export function ChoiceVisual(prompt: ClassificationPrompt, choice: ClassificationChoice) {
  const id = choice.id.toLowerCase();
  if (prompt.id === "sale-form") {
    return (
      <span className="choiceVisual">
        <Icon name={id === "weight" ? "scale" : id === "bag" ? "bag" : "loose"} />
      </span>
    );
  }
  if (id.includes("red")) return <span className="choiceVisual color" style={{ background: "#e95754" }} />;
  if (id.includes("yellow")) return <span className="choiceVisual color" style={{ background: "#e7c943" }} />;
  if (id.includes("green")) return <span className="choiceVisual color" style={{ background: "#37a94d" }} />;
  if (id.includes("pepper") || id.includes("bell")) {
    return (
      <span className="choiceVisual">
        <Icon name="bell" />
      </span>
    );
  }
  return <span className="choiceVisual color" style={{ background: "rgba(255,255,255,.18)" }} />;
}

export function friendlyQuestion(prompt: ClassificationPrompt): string {
  if (prompt.id === "family") return "What kind of produce is this?";
  if (prompt.id === "form") return "Which one matches?";
  if (prompt.id === "sale-form") return "How is this one sold?";
  return prompt.question;
}
