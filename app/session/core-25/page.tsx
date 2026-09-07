import { CoreSession } from "@/components/canon/CoreSession";
import { coreSessionStories } from "@/data/core-session";

export const metadata = { title: "Everyday five · PLU" };

export default function CoreSessionPage() {
  return <CoreSession stories={coreSessionStories} />;
}
