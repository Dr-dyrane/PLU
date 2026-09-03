import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "PLU",
    short_name: "PLU",
    description: "Learn produce identity and checkout codes.",
    start_url: "/",
    display: "standalone",
    background_color: "#020705",
    theme_color: "#07110f",
    icons: [
      { src: "/apple-icon.png", sizes: "180x180", type: "image/png" },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
    ],
  };
}
