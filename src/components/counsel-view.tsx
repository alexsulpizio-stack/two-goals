"use client";

import { useAppState } from "@/hooks/use-app-state";
import { independencePlan, sprintPlan } from "@/lib/finance";
import {
  CONFIDENCE_COPY,
  INTERVIEW_INTRO,
  INTERVIEW_QUESTIONS,
  clampInterviewStep,
  deriveCounsel,
  interviewComplete,
  type CounselAction,
  type CounselReport,
} from "@/lib/interview";
import { cn } from "@/lib/utils";

export function CounselView() {
  const { state } = useAppState();
  const interview = state.interview;
  const step = clampInterviewStep(interview.step);
  const complete = interviewComplete(interview);
  const questionIndex = complete ? INTERVIEW_QUESTIONS.length : Math.max(0, step);
  const question = INTERVIEW_QUESTIONS[Math.min(questionIndex, INTERVIEW_QUESTIONS.length - 1)];
  const showingIntro = !complete && step < 0;
  const sprint = sprintPlan(state.finance, state.finance.targetMonths);
  const report = complete
    ? deriveCounsel(interview.answers, sprint)
    : null;
  const hasLine = independencePlan(state.finance).hasInputs;

  return (
    <div id="counsel-root" className="flex flex-col gap-10">
      <section className="flex max-w-3xl flex-col gap-4">
        <p className="text-sm tracking-[0.18em] text-faith uppercase">
          {INTERVIEW_INTRO.kicker}
        </p>
        <h1 className="font-heading text-4xl leading-[1.1] text-balance sm:text-5xl">
          {INTERVIEW_INTRO.title}
        </h1>
        <p className="text-lg leading-relaxed text-muted-foreground text-pretty">
          {INTERVIEW_INTRO.body}
        </p>
      </section>

      <section
        id="counsel-intro"
        data-interview-panel="intro"
        hidden={!showingIntro}
        className="flex flex-col gap-4"
      >
        <p className="text-sm tracking-[0.18em] text-muted-foreground uppercase">
          Confidence, stated plainly
        </p>
        <div className="grid gap-4 lg:grid-cols-3">
          <ConfidenceCard
            level={CONFIDENCE_COPY.interview.level}
            title="I can interview you"
            body={CONFIDENCE_COPY.interview.body}
          />
          <ConfidenceCard
            level={CONFIDENCE_COPY.nextWeek.level}
            title="This week’s actions"
            body={CONFIDENCE_COPY.nextWeek.body}
          />
          <ConfidenceCard
            level={CONFIDENCE_COPY.date.level}
            title="Hitting the date"
            body={CONFIDENCE_COPY.date.body}
          />
        </div>
        <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
          {hasLine
            ? "Steward already has a nest egg to test against. Empty answers weaken the plan. You can go back."
            : "You can sit now. If Steward still has no living or giving, the date cannot be tested yet — I will say so at the end."}
        </p>
        <button
          type="button"
          data-interview-start=""
          className="inline-flex h-11 w-fit items-center justify-center rounded-lg bg-faith px-5 text-sm font-medium text-white hover:bg-faith/90"
        >
          Begin the interview
        </button>
      </section>

      <section
        id="counsel-ask"
        data-interview-panel="ask"
        hidden={showingIntro || complete}
        className="flex flex-col gap-6"
      >
        <div className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between gap-4">
            <p id="counsel-section" className="text-sm tracking-[0.18em] text-faith uppercase">
              {question?.section}
            </p>
            <p id="counsel-progress" className="text-sm text-muted-foreground">
              {Math.min(questionIndex + 1, INTERVIEW_QUESTIONS.length)} of{" "}
              {INTERVIEW_QUESTIONS.length}
            </p>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              id="counsel-progress-fill"
              className="bg-faith h-full rounded-full"
              style={{
                width: `${((questionIndex + 1) / INTERVIEW_QUESTIONS.length) * 100}%`,
              }}
            />
          </div>
        </div>

        {INTERVIEW_QUESTIONS.map((item, index) => (
          <article
            key={item.id}
            data-interview-q={item.id}
            hidden={index !== questionIndex}
            className="flex flex-col gap-4 rounded-2xl border border-border/80 bg-card/80 p-5 sm:p-7"
          >
            <h2
              data-interview-prompt=""
              className="font-heading text-2xl leading-tight text-balance sm:text-3xl"
            >
              {item.prompt}
            </h2>
            <p data-interview-hint="" className="text-sm leading-relaxed text-muted-foreground">
              {item.hint}
            </p>
            {item.field === "choice" ? (
              <div className="flex flex-col gap-2">
                {(item.choices ?? []).map((choice) => {
                  const selected = interview.answers[item.id] === choice.value;
                  return (
                    <button
                      key={choice.value}
                      type="button"
                      data-interview-choice={item.id}
                      data-value={choice.value}
                      aria-pressed={selected}
                      className={cn(
                        "rounded-xl border px-4 py-3 text-left text-sm leading-relaxed",
                        selected
                          ? "border-faith/40 bg-faith/10 text-foreground"
                          : "border-border bg-background hover:bg-muted/60"
                      )}
                    >
                      {choice.label}
                    </button>
                  );
                })}
              </div>
            ) : item.field === "number" ? (
              <input
                id={`answer-${item.id}`}
                data-interview-field={item.id}
                name={item.id}
                inputMode="decimal"
                placeholder={item.placeholder}
                defaultValue={interview.answers[item.id] ?? ""}
                suppressHydrationWarning
                className="h-11 w-full rounded-lg border border-input bg-transparent px-3 text-base md:text-sm"
              />
            ) : (
              <textarea
                id={`answer-${item.id}`}
                data-interview-field={item.id}
                name={item.id}
                rows={5}
                placeholder={item.placeholder}
                defaultValue={interview.answers[item.id] ?? ""}
                suppressHydrationWarning
                className="min-h-32 w-full rounded-lg border border-input bg-transparent px-3 py-2.5 text-base leading-relaxed md:text-sm"
              />
            )}
          </article>
        ))}

        <p id="counsel-empty-note" className="text-sm text-muted-foreground" hidden>
          You can leave this blank, but empty answers make a weaker week.
        </p>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            data-interview-back=""
            className="inline-flex h-11 items-center justify-center rounded-lg border border-border bg-background px-4 text-sm font-medium hover:bg-muted"
          >
            Back
          </button>
          <button
            type="button"
            id="counsel-next"
            data-interview-next=""
            className="inline-flex h-11 items-center justify-center rounded-lg bg-faith px-5 text-sm font-medium text-white hover:bg-faith/90"
          >
            {questionIndex >= INTERVIEW_QUESTIONS.length - 1
              ? "See this week’s actions"
              : "Next"}
          </button>
        </div>
      </section>

      <section
        id="counsel-report"
        data-interview-panel="report"
        hidden={!complete}
        className="flex flex-col gap-6"
      >
        <div id="counsel-report-body" data-react-report={report ? "1" : ""}>
          {report ? <CounselReportView report={report} /> : null}
        </div>
      </section>
    </div>
  );
}

function ConfidenceCard({
  level,
  title,
  body,
}: {
  level: string;
  title: string;
  body: string;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border/80 bg-card/80 p-5">
      <p className="text-xs tracking-[0.18em] text-muted-foreground uppercase">
        {level}
      </p>
      <h2 className="font-heading text-xl leading-tight">{title}</h2>
      <p className="text-sm leading-relaxed text-muted-foreground">{body}</p>
    </div>
  );
}

function CounselReportView({ report }: { report: CounselReport }) {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 lg:grid-cols-3">
        <ConfidenceCard
          level={labelLevel(report.interviewConfidence)}
          title="The interview"
          body={`${report.answered} of ${report.total} answered. The questions were the right ones. Missing answers are missing facts, not a mystery about you.`}
        />
        <ConfidenceCard
          level={labelLevel(report.nextWeekConfidence)}
          title="This week’s actions"
          body={
            report.nextWeekConfidence === "high"
              ? "You named people, an offer, hours, and a rate. The list below is a week of work, not a vibe."
              : report.nextWeekConfidence === "medium"
                ? "Enough is here to start. Names and a fourteen-day offer would raise this."
                : "Too many blanks. The list below is still honest, and thinner than it should be."
          }
        />
        <ConfidenceCard
          level={labelLevel(report.dateConfidence)}
          title="The independence date"
          body={
            report.dateConfidence === "none"
              ? "I will not bless a date the arithmetic cannot carry."
              : report.dateConfidence === "medium"
                ? "The hours × rate can cover the gap. A buyer has not said yes. That is not the same as arriving."
                : "Possible is not promised. The date stays unproven until money arrives."
          }
        />
      </div>

      <div
        id="counsel-honesty"
        className={cn(
          "rounded-2xl border px-5 py-4 text-sm leading-relaxed",
          report.dateHonest
            ? "border-steward/30 bg-steward/10"
            : "border-faith/30 bg-faith/10"
        )}
      >
        {report.honesty}
      </div>

      <ActionGroup kicker="Do these" title="This week" actions={report.thisWeek} />
      <ActionGroup kicker="Goal 01" title="The walk" actions={report.walkActions} />
      <ActionGroup kicker="Goal 02" title="The stream" actions={report.moneyActions} />

      {report.fences.length > 0 ? (
        <div className="flex flex-col gap-3 rounded-2xl border border-border/80 bg-card/80 p-5 sm:p-7">
          <p className="text-sm tracking-[0.18em] text-muted-foreground uppercase">
            Fences
          </p>
          <h2 className="font-heading text-2xl">Do not cross these to hit a date</h2>
          <ul className="flex flex-col gap-2">
            {report.fences.map((fence) => (
              <li key={fence} className="text-sm leading-relaxed">
                {fence}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          data-interview-apply-stream=""
          className="inline-flex h-11 items-center justify-center rounded-lg bg-steward px-5 text-sm font-medium text-white hover:bg-steward/90"
        >
          Put this stream on Steward
        </button>
        <a
          href="/steward"
          className="inline-flex h-11 items-center justify-center rounded-lg border border-border bg-background px-4 text-sm font-medium hover:bg-muted"
        >
          Open Steward
        </a>
        <button
          type="button"
          data-interview-retake=""
          className="inline-flex h-11 items-center justify-center rounded-lg px-4 text-sm font-medium text-muted-foreground underline-offset-4 hover:underline"
        >
          Revise answers
        </button>
      </div>
      <p id="counsel-apply-note" className="text-sm text-muted-foreground" hidden />
    </div>
  );
}

function ActionGroup({
  kicker,
  title,
  actions,
}: {
  kicker: string;
  title: string;
  actions: CounselAction[];
}) {
  return (
    <div className="flex flex-col gap-3">
      <div>
        <p className="text-sm tracking-[0.18em] text-muted-foreground uppercase">
          {kicker}
        </p>
        <h2 className="font-heading text-2xl sm:text-3xl">{title}</h2>
      </div>
      <ol className="flex flex-col gap-3">
        {actions.map((action, index) => (
          <li
            key={`${action.kicker}-${action.title}-${index}`}
            className="flex flex-col gap-2 rounded-2xl border border-border/80 bg-card/80 p-5"
          >
            <p className="text-xs tracking-[0.18em] text-muted-foreground uppercase">
              {action.kicker}
            </p>
            <h3 className="font-heading text-xl leading-tight">{action.title}</h3>
            <p className="text-sm leading-relaxed text-muted-foreground">{action.body}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}

function labelLevel(level: string) {
  if (level === "none") return "None";
  if (level === "low") return "Low";
  if (level === "medium") return "Medium";
  return "High";
}
