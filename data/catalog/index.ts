import type { CatalogItem } from "@/types/plu";
import chunk01 from "./01.json";
import chunk02 from "./02.json";
import chunk03 from "./03.json";
import chunk04 from "./04.json";
import chunk05 from "./05.json";
import chunk06 from "./06.json";
import chunk07 from "./07.json";
import chunk08 from "./08.json";
import chunk09 from "./09.json";
import chunk10 from "./10.json";

export const catalog = [
  ...chunk01,
  ...chunk02,
  ...chunk03,
  ...chunk04,
  ...chunk05,
  ...chunk06,
  ...chunk07,
  ...chunk08,
  ...chunk09,
  ...chunk10,
] as CatalogItem[];
