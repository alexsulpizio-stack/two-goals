import { GuidePanel } from "@/components/guide-panel";
import { IndependenceView } from "@/components/independence-view";

export default function IndependencePage() {
  return (
    <div className="flex flex-col gap-10">
      <GuidePanel />
      <IndependenceView />
    </div>
  );
}
