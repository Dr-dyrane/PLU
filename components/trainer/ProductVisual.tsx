import Image from "next/image";
import type { PluLesson } from "@/types/plu";

export function ProductVisual({ lesson }: { lesson: PluLesson }) {
  return (
    <div className="visual-column">
      <div className="visual-frame">
        <Image src={lesson.image} alt={lesson.alt} fill priority sizes="(max-width: 940px) 100vw, 52vw" />
        <div className="image-shade" aria-hidden="true" />
        <div className="image-meta">
          <span className="pill">{lesson.level}</span>
          <span className="pill weight-pill">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M8.5 5a3.5 3.5 0 1 1 7 0h1.1c1 0 1.9.7 2.1 1.7l2 11A2.8 2.8 0 0 1 18 21H6a2.8 2.8 0 0 1-2.7-3.3l2-11C5.5 5.7 6.4 5 7.4 5h1.1Zm2 0h3a1.5 1.5 0 0 0-3 0Zm1.5 4.1a3.2 3.2 0 1 0 0 6.4 3.2 3.2 0 0 0 0-6.4Zm0 1.7a1.5 1.5 0 0 1 1.3.8l-1.3.7v-1.5Z" />
            </svg>
            <span>{lesson.soldBy}</span>
          </span>
        </div>
        <div className="image-caption">
          <span>Visual family</span>
          <strong>{lesson.family}</strong>
        </div>
      </div>
      <div className="anchor-row" aria-label="Visual anchors">
        {lesson.visualAnchors.map((anchor) => <span className="anchor-chip" key={anchor}>{anchor}</span>)}
      </div>
    </div>
  );
}
