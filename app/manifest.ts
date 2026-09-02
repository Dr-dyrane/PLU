import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "PLU Visual Recall",
    short_name: "PLU Visual",
    description: "Learn produce PLU codes by image and active recall.",
    start_url: "/",
    display: "standalone",
    background_color: "#030807",
    theme_color: "#07110f",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
