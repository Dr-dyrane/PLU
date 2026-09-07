/** Only the next destination crosses into the interactive lesson. */
export interface LessonDestination {
  href: string;
  title: string;
  kind: "lesson" | "study";
}
