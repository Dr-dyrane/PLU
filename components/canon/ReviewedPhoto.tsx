"use client";

import { useEffect, useId, useState, type ImgHTMLAttributes } from "react";

import type { ProductPhoto, ProductPhotoRole } from "@/types/trace";

type ReviewedPhotoProps = Pick<
  ImgHTMLAttributes<HTMLImageElement>,
  "alt" | "aria-hidden" | "className" | "style" | "loading" | "decoding" | "fetchPriority" | "onError"
> & {
  photo: ProductPhoto;
  "data-role"?: ProductPhotoRole;
};

/** A reviewed panel is a viewport over the unchanged source raster. */
export function ReviewedPhoto({ photo, alt = photo.alt, ...imageProps }: ReviewedPhotoProps) {
  const clipId = `reviewed-photo-${useId().replaceAll(":", "")}`;
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const hasViewport = Boolean(photo.viewport);

  useEffect(() => {
    if (!hasViewport) return;
    // SVG image errors can occur before hydration attaches the handler.
    // A cache-sharing probe observes that early failure after hydration too.
    const probe = new Image();
    probe.onerror = () => setFailedSource(photo.src);
    probe.onload = () => setFailedSource((source) => source === photo.src ? null : source);
    probe.src = photo.src;
    return () => {
      probe.onerror = null;
      probe.onload = null;
    };
  }, [hasViewport, photo.src]);

  if (!photo.viewport) {
    return <img {...imageProps} src={photo.src} alt={alt} />;
  }

  const { x, y, width, height, sourceWidth, sourceHeight } = photo.viewport;
  const failed = failedSource === photo.src;
  const hidden = !failed && (imageProps["aria-hidden"] === true || imageProps["aria-hidden"] === "true");
  const label = failed ? `Photograph unavailable: ${photo.alt}` : alt;

  return (
    <div
      className={`reviewedPhotoViewport${imageProps.className ? ` ${imageProps.className}` : ""}`}
      style={imageProps.style}
      data-role={imageProps["data-role"]}
    >
      <svg
        width="100%"
        height="100%"
        viewBox={`${x} ${y} ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label={hidden ? undefined : label}
        aria-hidden={hidden || undefined}
        focusable="false"
        style={{ display: "block" }}
      >
        {failed ? (
          <text
            x={x + width / 2}
            y={y + height / 2}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="currentColor"
            fontSize={Math.max(20, height / 24)}
          >
            Photograph unavailable
          </text>
        ) : (
          <>
            <defs>
              <clipPath id={clipId} clipPathUnits="userSpaceOnUse">
                <rect x={x} y={y} width={width} height={height} />
              </clipPath>
            </defs>
            <g clipPath={`url(#${clipId})`}>
              <image
                href={photo.src}
                x="0"
                y="0"
                width={sourceWidth}
                height={sourceHeight}
                preserveAspectRatio="none"
                onError={() => setFailedSource(photo.src)}
              />
            </g>
          </>
        )}
      </svg>
    </div>
  );
}
