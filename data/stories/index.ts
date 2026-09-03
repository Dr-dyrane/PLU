import greenPepperRaw from "@/data/stories/green-pepper.json";
import type { ProductStory } from "@/types/trace";

export const greenPepperStory = greenPepperRaw as ProductStory;
export const productStories: ProductStory[] = [greenPepperStory];
