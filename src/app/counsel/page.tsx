import { CounselAnswerReview } from "@/components/counsel-answer-review";
import { CounselView } from "@/components/counsel-view";
import { INTERVIEW_QUESTIONS } from "@/lib/interview";

export default function CounselPage() {
  return (
    <div className="flex flex-col gap-10">
      <script
        id="interview-questions"
        type="application/json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(INTERVIEW_QUESTIONS).replace(/</g, "\\u003c"),
        }}
      />
      <CounselView />
      <CounselAnswerReview />
    </div>
  );
}
