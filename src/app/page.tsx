import { GuidePanel } from "@/components/guide-panel";
import { TodayHome } from "@/components/today-home";

export default function Home() {
  return (
    <div className="flex flex-col gap-10">
      <TodayHome />
      <GuidePanel
        title="Guide today"
        description="Ask what deserves attention now without opening every part of the app."
        starters={[
          "What should I focus on today?",
          "What is the most important financial next action?",
          "Is anything in my current plan contradicting my stated priorities?",
        ]}
      />
    </div>
  );
}
