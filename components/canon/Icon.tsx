import type { ClassificationChoice, ClassificationPrompt } from "@/types/trace";

export type CanonIconName = "bell" | "color" | "scale" | "bag" | "loose" | "bookmark" | "sound" | "muted" | "close";

export function Icon({ name }: { name: CanonIconName }) {
  const paths = {
    bell: "M21 7c-7 0-12 6-12 15 0 11 6 19 15 19s15-8 15-19c0-9-5-15-12-15-2-3-4-4-6-4s-4 1-6 4h6Zm3 6c5 0 8 4 8 10 0 7-3 12-8 12s-8-5-8-12c0-6 3-10 8-10Z",
    color: "M24 5S9 20 9 31a15 15 0 0 0 30 0C39 20 24 5 24 5Z",
    scale: "M17 12a7 7 0 0 1 14 0h3c3 0 5 2 6 5l4 22H4l4-22c1-3 3-5 6-5h3Zm5 0h4a3 3 0 0 0-6 0h2Zm2 8a8 8 0 1 0 0 16 8 8 0 0 0 0-16Zm0 4c2 0 4 2 4 4h-4v-4Z",
    bag: "M15 14h18l5 27H10l5-27Zm5 0a4 4 0 0 1 8 0h4a8 8 0 0 0-16 0h4Z",
    loose: "M24 8c-9 0-16 7-16 16s7 16 16 16 16-7 16-16S33 8 24 8Zm-3 8c-4 2-6 6-6 10 0 3 1 6 3 8-5-3-7-10-4-15 2-4 6-6 10-6l-3 3Z",
    bookmark: "M5 3h11a3 3 0 0 1 3 3v15l-7-3-7 3V3Zm2 2v12.9l5-2.1 5 2.1V6a1 1 0 0 0-1-1H7Z",
    sound: "M4 9h4l5-4v14l-5-4H4V9Zm12.5-2.5A8 8 0 0 1 21 13a8 8 0 0 1-4.5 6.5l-1-1.8A6 6 0 0 0 19 13a6 6 0 0 0-3.5-4.7l1-1.8Zm-1.9 3.1A4 4 0 0 1 17 13a4 4 0 0 1-2.4 3.4l-1-1.8A2 2 0 0 0 15 13a2 2 0 0 0-1.4-1.9l1-1.5Z",
    muted: "M4 9h4l5-4v14l-5-4H4V9Zm12.2 1.2 1.4-1.4 1.4 1.4 1.4-1.4 1.4 1.4-1.4 1.4 1.4 1.4-1.4 1.4-1.4-1.4-1.4 1.4-1.4-1.4 1.4-1.4-1.4-1.4Z",
    close: "m6.4 5 5.6 5.6L17.6 5 19 6.4 13.4 12l5.6 5.6-1.4 1.4-5.6-5.6L6.4 19 5 17.6l5.6-5.6L5 6.4 6.4 5Z",
  } as const;

  return (
    <svg viewBox={name === "bookmark" || name === "sound" || name === "muted" || name === "close" ? "0 0 24 24" : "0 0 48 48"} aria-hidden="true">
      <path d={paths[name]} />
    </svg>
  );
}

export function ChoiceVisual(prompt: ClassificationPrompt, choice: ClassificationChoice) {
  const id = choice.id.toLowerCase();
  if (prompt.id === "sale-form") {
    return <span className="choiceVisual"><Icon name={id === "weight" ? "scale" : id === "bag" ? "bag" : "loose"} /></span>;
  }
  if (id.includes("red")) return <span className="choiceVisual color" style={{ background: "#e95754" }} />;
  if (id.includes("yellow")) return <span className="choiceVisual color" style={{ background: "#e7c943" }} />;
  if (id.includes("green")) return <span className="choiceVisual color" style={{ background: "#37a94d" }} />;
  if (id.includes("pepper") || id.includes("bell")) return <span className="choiceVisual"><Icon name="bell" /></span>;
  return <span className="choiceVisual color" style={{ background: "rgba(255,255,255,.18)" }} />;
}

export function friendlyQuestion(prompt: ClassificationPrompt): string {
  if (prompt.id === "family") return "What kind of produce is this?";
  if (prompt.id === "form") return "Which one matches?";
  if (prompt.id === "sale-form") return "How is this one sold?";
  return prompt.question;
}
