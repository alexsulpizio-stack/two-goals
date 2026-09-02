import { CounselView } from "@/components/counsel-view";
import { INTERVIEW_QUESTIONS } from "@/lib/interview";

export default function CounselPage() {
  return (
    <>
      <script
        id="interview-questions"
        type="application/json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(INTERVIEW_QUESTIONS).replace(/</g, "\\u003c"),
        }}
      />
      <CounselView />
    </>
  );
}
