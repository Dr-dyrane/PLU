import avocadoRaw from "@/data/stories/avocado-4046.json";
import cubanellePepperRaw from "@/data/stories/cubanelle-pepper-4687.json";
import greenPepperRaw from "@/data/stories/green-pepper.json";
import jalapenoPepperRaw from "@/data/stories/jalapeno-pepper-4693.json";
import largeAvocadoRaw from "@/data/stories/large-avocado-4771.json";
import orangeBellPepperRaw from "@/data/stories/orange-bell-pepper-3121.json";
import plantainRaw from "@/data/stories/plantain-4235.json";
import redBellPepperRaw from "@/data/stories/red-bell-pepper-4688.json";
import yellowBananaRaw from "@/data/stories/yellow-banana-4011.json";
import yellowBellPepperRaw from "@/data/stories/yellow-bell-pepper-4689.json";
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

export const redBellPepperStory = redBellPepperRaw as ProductStory;
export const yellowBellPepperStory = yellowBellPepperRaw as ProductStory;
export const orangeBellPepperStory = orangeBellPepperRaw as ProductStory;
export const jalapenoPepperStory = jalapenoPepperRaw as ProductStory;
export const cubanellePepperStory = cubanellePepperRaw as ProductStory;
export const yellowBananaStory = yellowBananaRaw as ProductStory;
export const plantainStory = plantainRaw as ProductStory;
export const avocadoStory = avocadoRaw as ProductStory;
export const largeAvocadoStory = largeAvocadoRaw as ProductStory;

export const productStories: ProductStory[] = [
  greenPepperStory,
  redBellPepperStory,
  yellowBellPepperStory,
  orangeBellPepperStory,
  jalapenoPepperStory,
  cubanellePepperStory,
  yellowBananaStory,
  plantainStory,
  avocadoStory,
  largeAvocadoStory,
];

export const productStoryById = new Map(
  productStories.map((story) => [story.id, story]),
);

export const productStoryByCatalogId = new Map(
  productStories.map((story) => [story.catalogId, story]),
);
