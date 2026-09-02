import single from "./single.json";
import pairs00to24 from "./00-24.json";
import pairs25to49 from "./25-49.json";
import pairs50to74 from "./50-74.json";
import pairs75to99 from "./75-99.json";

export const pegTable = {
  single,
  pairs: {
    ...pairs00to24,
    ...pairs25to49,
    ...pairs50to74,
    ...pairs75to99,
  },
} as const;
