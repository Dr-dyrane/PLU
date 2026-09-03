import type { CSSProperties, ReactNode } from "react";

import type { ProductPhoto, ProductStory } from "@/types/trace";

type TraceMediaStyle = CSSProperties & {
  "--trace-photo-primary-position": string;
  "--trace-photo-alternate": string;
  "--trace-photo-alternate-position": string;
  "--trace-photo-context": string;
  "--trace-photo-context-position": string;
};

function cssUrl(src: string): string {
  return `url("${src}")`;
}

function photoForRole(
  photos: ProductPhoto[],
  role: ProductPhoto["role"],
  fallback: ProductPhoto,
): ProductPhoto {
  return photos.find((photo) => photo.role === role) ?? fallback;
}

export function TraceMediaShell({
  story,
  children,
}: {
  story: ProductStory;
  children: ReactNode;
}) {
  const hero = photoForRole(story.photos, "hero", story.photos[0]);
  const alternate = photoForRole(story.photos, "alternate", hero);
  const context = photoForRole(story.photos, "context", alternate);

  const style: TraceMediaStyle = {
    "--trace-photo-primary-position": hero.focus ?? "50% 50%",
    "--trace-photo-alternate": cssUrl(alternate.src),
    "--trace-photo-alternate-position": alternate.focus ?? "50% 50%",
    "--trace-photo-context": cssUrl(context.src),
    "--trace-photo-context-position": context.focus ?? "50% 50%",
  };

  return (
    <div
      className="trace-media-root"
      style={style}
      data-photo-count={story.photos.length}
    >
      {children}
    </div>
  );
}
