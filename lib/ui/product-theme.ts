import type { CSSProperties } from "react";
import type { ProductStory } from "@/types/trace";

type ThemeStyle = CSSProperties & {
  "--accent-light": string;
  "--accent-light-strong": string;
  "--accent-light-rgb": string;
  "--accent-dark": string;
  "--accent-dark-strong": string;
  "--accent-dark-rgb": string;
};

type Tone = {
  accent: string;
  strong: string;
  rgb: string;
};

type Accent = {
  light: Tone;
  dark: Tone;
};

const byColor: Record<string, Accent> = {
  green: {
    light: { accent: "#176B3A", strong: "#0F552D", rgb: "23, 107, 58" },
    dark: { accent: "#7CE7A0", strong: "#43D27B", rgb: "124, 231, 160" },
  },
  red: {
    light: { accent: "#B83E3A", strong: "#92312E", rgb: "184, 62, 58" },
    dark: { accent: "#FF8D88", strong: "#E85F5A", rgb: "255, 141, 136" },
  },
  yellow: {
    light: { accent: "#876700", strong: "#6B5100", rgb: "135, 103, 0" },
    dark: { accent: "#F2D766", strong: "#D6B934", rgb: "242, 215, 102" },
  },
  orange: {
    light: { accent: "#A45100", strong: "#813F00", rgb: "164, 81, 0" },
    dark: { accent: "#FFB36B", strong: "#EE8D36", rgb: "255, 179, 107" },
  },
  purple: {
    light: { accent: "#7043A4", strong: "#56317F", rgb: "112, 67, 164" },
    dark: { accent: "#C6A2FF", strong: "#9D73E8", rgb: "198, 162, 255" },
  },
  blue: {
    light: { accent: "#2C61A9", strong: "#204A84", rgb: "44, 97, 169" },
    dark: { accent: "#8CBCFF", strong: "#5D92DF", rgb: "140, 188, 255" },
  },
  white: {
    light: { accent: "#596762", strong: "#3F4C47", rgb: "89, 103, 98" },
    dark: { accent: "#D8E2DE", strong: "#AEBDB7", rgb: "216, 226, 222" },
  },
  brown: {
    light: { accent: "#80582F", strong: "#624321", rgb: "128, 88, 47" },
    dark: { accent: "#D5AA7C", strong: "#AA7D50", rgb: "213, 170, 124" },
  },
  black: {
    light: { accent: "#525D62", strong: "#3E474B", rgb: "82, 93, 98" },
    dark: { accent: "#C4CCD0", strong: "#939DA2", rgb: "196, 204, 208" },
  },
};

const byFamily: Record<string, Accent> = {
  peppers: byColor.green,
  tomatoes: byColor.red,
  citrus: byColor.orange,
  apples: byColor.red,
  berries: {
    light: { accent: "#7A459D", strong: "#5D3379", rgb: "122, 69, 157" },
    dark: { accent: "#D99CFF", strong: "#AD6DE1", rgb: "217, 156, 255" },
  },
  melons: {
    light: { accent: "#287447", strong: "#1D5935", rgb: "40, 116, 71" },
    dark: { accent: "#92E0AA", strong: "#63BD7F", rgb: "146, 224, 170" },
  },
  herbs: {
    light: { accent: "#246E43", strong: "#195431", rgb: "36, 110, 67" },
    dark: { accent: "#83DCA2", strong: "#52B978", rgb: "131, 220, 162" },
  },
};

function normalize(value: string) {
  return value.trim().toLowerCase();
}

export function productTheme(story: ProductStory): ThemeStyle {
  const chosen = byColor[normalize(story.identity.color)] ?? byFamily[normalize(story.family)] ?? byColor.green;

  return {
    "--accent-light": chosen.light.accent,
    "--accent-light-strong": chosen.light.strong,
    "--accent-light-rgb": chosen.light.rgb,
    "--accent-dark": chosen.dark.accent,
    "--accent-dark-strong": chosen.dark.strong,
    "--accent-dark-rgb": chosen.dark.rgb,
  };
}
