"use client";

import { useAppState } from "@/hooks/use-app-state";
import { INTERVIEW_QUESTIONS, interviewComplete } from "@/lib/interview";

export function CounselAnswerReview() {
  const { state, setState } = useAppState();
  const interview = state.interview;
  if (!interviewComplete(interview)) return null;

  const answered = INTERVIEW_QUESTIONS.filter(
    (question) => (interview.answers[question.id] ?? "").trim().length > 0
  );

  const edit = (index: number) => {
    setState((previous) => ({
      ...previous,
      interview: {
        ...previous.interview,
        step: index,
        completedAt: null,
      },
    }));
    window.setTimeout(() => {
      document.getElementById("counsel-ask")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 0);
  };

  return (
    <section className="rounded-2xl border border-border/80 bg-card/80 p-5 sm:p-7">
      <p className="text-sm tracking-[0.18em] text-muted-foreground uppercase">
        Answer review
      </p>
      <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-heading text-2xl sm:text-3xl">Revise one answer without restarting</h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Your other answers stay intact. Pick the exact question that changed, revise it, then continue forward to refresh the plan.
          </p>
        </div>
        <span className="text-sm text-muted-foreground">
          {answered.length} of {INTERVIEW_QUESTIONS.length} answered
        </span>
      </div>

      <div className="mt-5 grid gap-2 md:grid-cols-2">
        {INTERVIEW_QUESTIONS.map((question, index) => {
          const answer = (interview.answers[question.id] ?? "").trim();
          return (
            <button
              key={question.id}
              type="button"
              onClick={() => edit(index)}
              className="rounded-xl border border-border bg-background p-4 text-left transition-colors hover:bg-muted/60"
            >
              <span className="text-xs tracking-wide text-muted-foreground uppercase">
                {index + 1}. {question.section}
              </span>
              <span className="mt-1 block font-medium leading-snug">{question.prompt}</span>
              <span className="mt-2 line-clamp-2 block text-sm text-muted-foreground">
                {answer || "No answer yet"}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
