import greenPepperRaw from "@/data/stories/green-pepper.json";
import type { ProductStory } from "@/types/trace";

export const greenPepperStory: ProductStory = {
  ...(greenPepperRaw as ProductStory),
  similarItems: [
    {
      name: "Red bell pepper",
      code: "4688",
      cue: "Same bell shape; look for fully red skin.",
      color: "#df4f4b",
    },
    {
      name: "Yellow bell pepper",
      code: "4689",
      cue: "Same bell shape; look for bright yellow skin.",
      color: "#e2c83f",
    },
    {
      name: "Cubanelle",
      code: "4687",
      cue: "Longer, lighter, and tapered rather than blocky.",
      color: "#8bb64a",
    },
  ],
};

export const productStories: ProductStory[] = [greenPepperStory];
