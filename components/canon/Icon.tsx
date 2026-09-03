"use client";

import {
  Apple,
  Banana,
  Bookmark,
  CircleDot,
  Droplet,
  Leaf,
  Salad,
  Scale,
  Shapes,
  ShoppingBag,
  Volume2,
  VolumeX,
  X,
  type LucideIcon,
} from "lucide-react";
import { createContext, useContext, type ReactNode } from "react";

import type { ClassificationChoice, ClassificationPrompt, ProductStory } from "@/types/trace";

export type CanonIconName =
  | "shape"
  | "bell"
  | "color"
  | "scale"
  | "each"
  | "bag"
  | "loose"
  | "banana"
  | "avocado"
  | "fruit"
  | "leaf"
  | "bookmark"
  | "sound"
  | "muted"
  | "close";

const icons: Record<CanonIconName, LucideIcon> = {
  shape: Shapes,
  bell: Shapes,
  color: Droplet,
  scale: Scale,
  each: CircleDot,
  bag: ShoppingBag,
  loose: Salad,
  banana: Banana,
  avocado: CircleDot,
  fruit: Apple,
  leaf: Leaf,
  bookmark: Bookmark,
  sound: Volume2,
  muted: VolumeX,
  close: X,
};

const ProductIconContext = createContext<{
  family: string;
  soldBy: ProductStory["checkout"]["soldBy"];
} | null>(null);

export function ProductIconProvider({
  story,
  children,
}: {
  story: ProductStory;
  children: ReactNode;
}) {
  return (
    <ProductIconContext.Provider
      value={{ family: story.family, soldBy: story.checkout.soldBy }}
    >
      {children}
    </ProductIconContext.Provider>
  );
}

export function itemIconName(value: string): CanonIconName {
  const id = value.toLowerCase();
  if (id.includes("banana") || id.includes("plantain")) return "banana";
  if (id.includes("avocado")) return "avocado";
  if (id.includes("apple") || id.includes("mango") || id.includes("pear") || id.includes("fruit")) return "fruit";
  if (id.includes("herb") || id.includes("cilantro") || id.includes("parsley") || id.includes("leaf")) return "leaf";
  return "shape";
}

export function Icon({ name }: { name: CanonIconName }) {
  const product = useContext(ProductIconContext);
  const effectiveName =
    name === "bell" && product
      ? itemIconName(product.family)
      : name === "scale" && product?.soldBy === "Each"
        ? "each"
        : name;
  const Glyph = icons[effectiveName];
  return <Glyph aria-hidden="true" strokeWidth={1.9} />;
}

export function ItemGlyph({ label, color }: { label: string; color?: string }) {
  return (
    <span className="itemGlyph" style={color ? { color } : undefined} aria-hidden="true">
      <Icon name={itemIconName(label)} />
    </span>
  );
}

export function ChoiceVisual(prompt: ClassificationPrompt, choice: ClassificationChoice) {
  const id = choice.id.toLowerCase();

  if (prompt.id === "sale-form") {
    return (
      <span className="choiceVisual">
        <Icon name={id === "weight" ? "scale" : id === "bag" ? "bag" : "each"} />
      </span>
    );
  }

  if (prompt.id === "family") {
    return <span className="choiceVisual"><Icon name={itemIconName(id)} /></span>;
  }

  if (id.includes("banana") || id.includes("plantain")) {
    return <span className="choiceVisual"><Icon name="banana" /></span>;
  }

  if (id.includes("avocado")) {
    return <span className="choiceVisual"><Icon name="avocado" /></span>;
  }

  if (id.includes("red")) return <span className="choiceVisual color" style={{ background: "#e95754" }} />;
  if (id.includes("yellow")) return <span className="choiceVisual color" style={{ background: "#e7c943" }} />;
  if (id.includes("orange")) return <span className="choiceVisual color" style={{ background: "#ed9344" }} />;
  if (id.includes("green")) return <span className="choiceVisual color" style={{ background: "#37a94d" }} />;

  return <span className="choiceVisual"><Icon name={itemIconName(id)} /></span>;
}

export function friendlyQuestion(prompt: ClassificationPrompt): string {
  if (prompt.id === "family") return "What kind of produce is this?";
  if (prompt.id === "form") return "Which one matches?";
  if (prompt.id === "sale-form") return "How is this one sold?";
  return prompt.question;
}
