import type { CSSProperties } from "react";
import type { ProductStory } from "@/types/trace";

type ThemeStyle = CSSProperties & {
  "--accent": string;
  "--accent-strong": string;
  "--accent-rgb": string;
};

type Accent = {
  accent: string;
  strong: string;
  rgb: string;
};

const byColor: Record<string, Accent> = {
  green: { accent: "#7ce7a0", strong: "#43d27b", rgb: "124, 231, 160" },
  red: { accent: "#ff8d88", strong: "#e85f5a", rgb: "255, 141, 136" },
  yellow: { accent: "#f2d766", strong: "#d6b934", rgb: "242, 215, 102" },
  orange: { accent: "#ffb36b", strong: "#ee8d36", rgb: "255, 179, 107" },
  purple: { accent: "#c6a2ff", strong: "#9d73e8", rgb: "198, 162, 255" },
  blue: { accent: "#8cbcff", strong: "#5d92df", rgb: "140, 188, 255" },
  white: { accent: "#d8e2de", strong: "#aebdb7", rgb: "216, 226, 222" },
  brown: { accent: "#d5aa7c", strong: "#aa7d50", rgb: "213, 170, 124" },
  black: { accent: "#c4ccd0", strong: "#939da2", rgb: "196, 204, 208" },
};

const byFamily: Record<string, Accent> = {
  peppers: byColor.green,
  tomatoes: byColor.red,
  citrus: byColor.orange,
  apples: byColor.red,
  berries: { accent: "#d99cff", strong: "#ad6de1", rgb: "217, 156, 255" },
  melons: { accent: "#92e0aa", strong: "#63bd7f", rgb: "146, 224, 170" },
  herbs: { accent: "#83dca2", strong: "#52b978", rgb: "131, 220, 162" },
};

function normalize(value: string) {
  return value.trim().toLowerCase();
}

export function productTheme(story: ProductStory): ThemeStyle {
  const color = byColor[normalize(story.identity.color)];
  const family = byFamily[normalize(story.family)];
  const chosen = color ?? family ?? byColor.green;

  return {
    "--accent": chosen.accent,
    "--accent-strong": chosen.strong,
    "--accent-rgb": chosen.rgb,
  };
}
