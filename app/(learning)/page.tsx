import { LegacyLibraryRedirect } from "@/components/canon/LegacyLibraryRedirect";
import { TodayHome } from "@/components/canon/TodayHome";
import { coreSessionSignature, coreSessionSummaries } from "@/data/core-session";

export default function HomePage() {
  return (
    <>
      <LegacyLibraryRedirect />
      <TodayHome items={coreSessionSummaries} signature={coreSessionSignature} />
    </>
  );
}
