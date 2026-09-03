import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

import "./globals.css";

const themeBootScript = `
(() => {
  const root = document.documentElement;
  let theme = "light";
  try {
    theme = localStorage.getItem("plu:theme") === "dark" ? "dark" : "light";
  } catch {}
  root.dataset.theme = theme;
  root.style.colorScheme = theme;
  const syncThemeColor = () => {
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", theme === "dark" ? "#07110F" : "#F2F2F7");
  };
  syncThemeColor();
  document.addEventListener("DOMContentLoaded", syncThemeColor, { once: true });
})();`;

const productImageFallbackScript = `
(() => {
  const selector = ".batchLessonCard > img, img.productPhoto";
  const fallback = "/product-placeholder.svg";
  window.addEventListener("error", (event) => {
    const image = event.target;
    if (!(image instanceof HTMLImageElement) || !image.matches(selector)) return;
    if (image.dataset.pluFallbackApplied === "true") return;
    image.dataset.pluFallbackApplied = "true";
    image.removeAttribute("srcset");
    image.src = fallback;
  }, true);
})();`;

export const metadata: Metadata = {
  title: "PLU",
  description: "See produce, identify the exact item, and recall its checkout code.",
  applicationName: "PLU",
  icons: {
    icon: [{ url: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
    shortcut: [{ url: "/icon.svg", type: "image/svg+xml" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#F2F2F7",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" data-theme="light" suppressHydrationWarning>
      <head>
        <script id="plu-theme-boot" dangerouslySetInnerHTML={{ __html: themeBootScript }} />
        <script
          id="plu-product-image-fallback"
          dangerouslySetInnerHTML={{ __html: productImageFallbackScript }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
