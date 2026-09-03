"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

export type PluTheme = "light" | "dark";

const storageKey = "plu:theme";
const themeColors: Record<PluTheme, string> = {
  light: "#F2F2F7",
  dark: "#07110F",
};

function currentTheme(): PluTheme {
  if (typeof document === "undefined") return "light";
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

function applyTheme(theme: PluTheme, persist = true) {
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.style.colorScheme = theme;

  const themeColor = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  themeColor?.setAttribute("content", themeColors[theme]);

  if (persist) {
    try {
      window.localStorage.setItem(storageKey, theme);
    } catch {
      // The visual preference still applies when storage is unavailable.
    }
  }

  window.dispatchEvent(new CustomEvent("plu:themechange", { detail: { theme } }));
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<PluTheme>("light");

  useEffect(() => {
    const sync = () => setTheme(currentTheme());
    sync();
    window.addEventListener("plu:themechange", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("plu:themechange", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const dark = theme === "dark";

  return (
    <button
      className="themeToggle"
      type="button"
      role="switch"
      aria-checked={dark}
      aria-label={dark ? "Use light appearance" : "Use dark appearance"}
      onClick={() => {
        const next: PluTheme = dark ? "light" : "dark";
        applyTheme(next);
        setTheme(next);
      }}
    >
      <span className="themeToggleCopy">
        {dark ? <Moon aria-hidden="true" /> : <Sun aria-hidden="true" />}
        <span><small>Appearance</small><strong>{dark ? "Dark" : "Light"}</strong></span>
      </span>
      <span className="themeToggleTrack" aria-hidden="true">
        <span className="themeToggleThumb" />
      </span>
    </button>
  );
}
