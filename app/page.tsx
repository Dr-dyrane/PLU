import Link from "next/link";
import { HomeFooter } from "@/components/canon/HomeFooter";
import { LearningNavigation } from "@/components/canon/LearningNavigation";
import { LegacyLibraryRedirect } from "@/components/canon/LegacyLibraryRedirect";
import { TodayHome } from "@/components/canon/TodayHome";
import { coreSessionSignature, coreSessionSummaries } from "@/data/core-session";

export default function HomePage() {
  return (
    <div className="learningApp">
      <LegacyLibraryRedirect />
      <header className="learningHeader">
        <Link className="batchBrand" href="/" aria-label="PLU home">
          <img src="/icon.svg" alt="" aria-hidden="true" />
          <span><strong>PLU</strong><small>See it. Know it. Ring it.</small></span>
        </Link>
        <LearningNavigation active="today" />
      </header>
      <TodayHome items={coreSessionSummaries} signature={coreSessionSignature} />
      <HomeFooter />
    </div>
  );
}
