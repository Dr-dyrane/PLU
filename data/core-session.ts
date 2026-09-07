import { core25Stories } from "@/data/stories";
import { sessionSignature } from "@/lib/trace/core-session";

// One intentionally small session. These are authored Core 25 lessons, not generated codes.
const ids = ["green-pepper-4065", "yellow-banana-4011", "avocado-4046", "lemon-4053", "field-cucumber-4062"];

export const coreSessionStories = ids.map((id) => {
  const story = core25Stories.find((item) => item.id === id);
  if (!story) throw new Error(`Core session story is missing: ${id}`);
  return story;
});

export const coreSessionSignature = sessionSignature(coreSessionStories.map((story) => ({ id: story.id, code: story.checkout.code })));

export const coreSessionSummaries = coreSessionStories.map((story) => {
  const hero = story.photos.find((photo) => photo.role === "hero") ?? story.photos[0];
  if (!hero) throw new Error(`Core session photograph is missing: ${story.id}`);
  return { id: story.id, title: story.title, shortTitle: story.shortTitle, hero };
});
