import { QuickenImport } from "@/components/quicken-import";
import { StewardInsights } from "@/components/steward-insights";
import { StewardView } from "@/components/steward-view";

export default function StewardPage() {
  return (
    <div className="flex flex-col gap-10">
      <StewardInsights />
      <QuickenImport />
      <StewardView />
    </div>
  );
}
