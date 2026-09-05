import { readJson, loadRelationshipInputs, validateRelationshipLessons } from "./relationship-data.mjs";
validateRelationshipLessons(await readJson("data/relationship-lessons.json"), await loadRelationshipInputs());
console.log("Validated exact 19 relationship lessons, full source code sets, neighbor flags, separate completion, and photo provenance.");
