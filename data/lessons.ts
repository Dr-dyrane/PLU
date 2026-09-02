import { pegTable } from "@/data/pegs";
import { findCatalogItem } from "@/lib/catalog";
import { chunkPluCode } from "@/lib/mnemonic";
import type { PluLesson } from "@/types/plu";

const greenPepperRecord = findCatalogItem("Peppers - Green", "4065");
const greenPepperCode = greenPepperRecord.codes.find((code) => code === "4065")!;

function pegName(chunk: string): string {
  const entry =
    chunk.length === 1
      ? pegTable.single[chunk as keyof typeof pegTable.single]
      : pegTable.pairs[chunk as keyof typeof pegTable.pairs];

  if (!entry) {
    throw new Error(`Mnemonic peg not found for ${chunk}`);
  }

  return entry.name;
}

export const lessons: PluLesson[] = [
  {
    id: "green-pepper-4065",
    sequence: 1,
    deckSize: 25,
    level: "Must Know",
    name: "Green pepper",
    shortName: "Green",
    code: greenPepperCode,
    soldBy: greenPepperRecord.soldBy ?? "Weight",
    soldByShort: greenPepperRecord.soldBy === "Each" ? "ea" : "wt",
    family: "Peppers",
    image: "/produce/green-pepper-4065.svg",
    alt: "Several glossy green bell peppers, including one cut open",
    visualAnchors: [
      "Blocky bell shape",
      "Smooth, glossy skin",
      "Deep green color",
    ],
    recognitionHint:
      "Look for a broad bell shape—not a long or tapered pepper.",
    memoryHook: {
      label: "Optional rescue hook",
      chunks: chunkPluCode(greenPepperCode).map((code) => ({
        code,
        peg: pegName(code),
      })),
      story: "Picture Rick Ross handing Julius Caesar a giant green pepper.",
    },
    contrast: [
      {
        name: "Green",
        code: "4065",
        color: "#55c858",
        shape: "bell",
        current: true,
      },
      { name: "Red", code: "4688", color: "#ef4b4b", shape: "bell" },
      { name: "Yellow", code: "4689", color: "#f5c744", shape: "bell" },
      { name: "Orange", code: "3121", color: "#f69032", shape: "bell" },
      { name: "Jalapeño", code: "4693", color: "#2fa861", shape: "long" },
      { name: "Cubanelle", code: "4687", color: "#9acb4d", shape: "long" },
    ],
  },
];
