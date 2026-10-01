import { GuidePanel } from "@/components/guide-panel";
import { IndependenceView } from "@/components/independence-view";

export default function IndependencePage() {
  return (
    <div className="flex flex-col gap-10">
      <GuidePanel
        title="Guide the decision"
        description="Ask about the retirement scenarios using the assumptions already in the engine."
        starters={[
          "Which scenario is strongest and why?",
          "What assumption is doing the most work in the age-55 case?",
          "What should I verify before relying on the bridge-job scenario?",
          "What would make the red scenario turn green?",
        ]}
      />
      <IndependenceView />
    </div>
  );
}
