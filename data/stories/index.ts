import avocadoRaw from "@/data/stories/avocado-4046.json";
import broccoliBunchRaw from "@/data/stories/broccoli-bunch-4060.json";
import broccoliCrownRaw from "@/data/stories/broccoli-crown-3082.json";
import cilantroRaw from "@/data/stories/cilantro-4889.json";
import cubanellePepperRaw from "@/data/stories/cubanelle-pepper-4687.json";
import englishCucumberRaw from "@/data/stories/english-cucumber-4593.json";
import fieldCucumberRaw from "@/data/stories/field-cucumber-4062.json";
import gingerRootRaw from "@/data/stories/ginger-root-4612.json";
import greenPepperRaw from "@/data/stories/green-pepper.json";
import honeycrispAppleRaw from "@/data/stories/honeycrisp-apple-3283.json";
import jalapenoPepperRaw from "@/data/stories/jalapeno-pepper-4693.json";
import largeAvocadoRaw from "@/data/stories/large-avocado-4771.json";
import lemonRaw from "@/data/stories/lemon-4053.json";
import limeRaw from "@/data/stories/lime-4048.json";
import looseGarlicRaw from "@/data/stories/loose-garlic-4608.json";
import orangeBellPepperRaw from "@/data/stories/orange-bell-pepper-3121.json";
import plantainRaw from "@/data/stories/plantain-4235.json";
import redBellPepperRaw from "@/data/stories/red-bell-pepper-4688.json";
import redOnionRaw from "@/data/stories/red-onion-4082.json";
import romaTomatoRaw from "@/data/stories/roma-tomato-4087.json";
import russetPotatoRaw from "@/data/stories/russet-potato-4072.json";
import whitePotatoRaw from "@/data/stories/white-potato-4083.json";
import yellowBananaRaw from "@/data/stories/yellow-banana-4011.json";
import yellowBellPepperRaw from "@/data/stories/yellow-bell-pepper-4689.json";
import yellowOnionRaw from "@/data/stories/yellow-onion-4658.json";
import batch02P01 from "@/data/story-batches/batch-02-01.json";
import batch02P02 from "@/data/story-batches/batch-02-02.json";
import batch02P03 from "@/data/story-batches/batch-02-03.json";
import batch02P04 from "@/data/story-batches/batch-02-04.json";
import batch02P05 from "@/data/story-batches/batch-02-05.json";
import batch02P06 from "@/data/story-batches/batch-02-06.json";
import batch02P07 from "@/data/story-batches/batch-02-07.json";
import batch02P08 from "@/data/story-batches/batch-02-08.json";
import batch02P09 from "@/data/story-batches/batch-02-09.json";
import batch02P10 from "@/data/story-batches/batch-02-10.json";
import type { ProductStory } from "@/types/trace";

export const greenPepperStory: ProductStory = {
  ...(greenPepperRaw as ProductStory),
  similarItems: [
    { name: "Red bell pepper", code: "4688", cue: "Same bell shape; look for fully red skin.", color: "#df4f4b" },
    { name: "Yellow bell pepper", code: "4689", cue: "Same bell shape; look for bright yellow skin.", color: "#e2c83f" },
    { name: "Cubanelle", code: "4687", cue: "Longer, lighter, and tapered rather than blocky.", color: "#8bb64a" },
  ],
};

export const avocadoStory = avocadoRaw as ProductStory;
export const broccoliBunchStory = broccoliBunchRaw as ProductStory;
export const broccoliCrownStory = broccoliCrownRaw as ProductStory;
export const cilantroStory = cilantroRaw as ProductStory;
export const cubanellePepperStory = cubanellePepperRaw as ProductStory;
export const englishCucumberStory = englishCucumberRaw as ProductStory;
export const fieldCucumberStory = fieldCucumberRaw as ProductStory;
export const gingerRootStory = gingerRootRaw as ProductStory;
export const honeycrispAppleStory = honeycrispAppleRaw as ProductStory;
export const jalapenoPepperStory = jalapenoPepperRaw as ProductStory;
export const largeAvocadoStory = largeAvocadoRaw as ProductStory;
export const lemonStory = lemonRaw as ProductStory;
export const limeStory = limeRaw as ProductStory;
export const looseGarlicStory = looseGarlicRaw as ProductStory;
export const orangeBellPepperStory = orangeBellPepperRaw as ProductStory;
export const plantainStory = plantainRaw as ProductStory;
export const redBellPepperStory = redBellPepperRaw as ProductStory;
export const redOnionStory = redOnionRaw as ProductStory;
export const romaTomatoStory = romaTomatoRaw as ProductStory;
export const russetPotatoStory = russetPotatoRaw as ProductStory;
export const whitePotatoStory = whitePotatoRaw as ProductStory;
export const yellowBananaStory = yellowBananaRaw as ProductStory;
export const yellowBellPepperStory = yellowBellPepperRaw as ProductStory;
export const yellowOnionStory = yellowOnionRaw as ProductStory;
export const batch02Stories: ProductStory[] = [
  ...(batch02P01 as ProductStory[]),
  ...(batch02P02 as ProductStory[]),
  ...(batch02P03 as ProductStory[]),
  ...(batch02P04 as ProductStory[]),
  ...(batch02P05 as ProductStory[]),
  ...(batch02P06 as ProductStory[]),
  ...(batch02P07 as ProductStory[]),
  ...(batch02P08 as ProductStory[]),
  ...(batch02P09 as ProductStory[]),
  ...(batch02P10 as ProductStory[]),
];

export const core25Stories: ProductStory[] = [
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
  lemonStory,
  limeStory,
  cilantroStory,
  gingerRootStory,
  looseGarlicStory,
  redOnionStory,
  yellowOnionStory,
  russetPotatoStory,
  whitePotatoStory,
  romaTomatoStory,
  fieldCucumberStory,
  englishCucumberStory,
  broccoliBunchStory,
  broccoliCrownStory,
  honeycrispAppleStory,
];

export const productStories: ProductStory[] = [...core25Stories, ...batch02Stories];

export const productStoryById = new Map(productStories.map((story) => [story.id, story]));
export const productStoryByCatalogId = new Map(productStories.map((story) => [story.catalogId, story]));
