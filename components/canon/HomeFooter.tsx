import { ShieldCheck } from "lucide-react";

import { ThemeToggle } from "@/components/canon/ThemeToggle";

export function HomeFooter() {
  return (
    <footer className="appFooter" aria-label="Application settings">
      <span className="footerLocal">
        <ShieldCheck aria-hidden="true" />
        <span className="footerLocalLong">Progress stays on this device</span>
        <span className="footerLocalShort">Local progress</span>
      </span>
      <ThemeToggle />
    </footer>
  );
}
