"use client";

import { ArrowLeft, ArrowRight } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAppState } from "@/hooks/use-app-state";
import { sprintPlan } from "@/lib/finance";
import {
  INTERVIEW_QUESTIONS,
  deriveCounsel,
  type CounselAction,
} from "@/lib/interview";
import { cn } from "@/lib/utils";

export function PlanAssistant() {
  const { state, setState } = useAppState();
  const interview = state.interview;
  const total = INTERVIEW_QUESTIONS.length;
  const started = interview.step >= 0 || Boolean(interview.completedAt);
  const complete = Boolean(interview.completedAt) || interview.step >= total;
  const index = Math.min(Math.max(interview.step, 0), total - 1);
  const question = INTERVIEW_QUESTIONS[index];
  const report = complete ? deriveCounsel(interview.answers, sprintPlan(state.finance, state.finance.targetMonths)) : null;

  function patchInterview(patch: Partial<typeof interview>) {
    setState((previous) => ({
      ...previous,
      interview: { ...previous.interview, ...patch },
    }));
  }

  function answer(value: string) {
    if (!question) return;
    patchInterview({ answers: { ...interview.answers, [question.id]: value } });
  }

  function next() {
    if (index >= total - 1) {
      patchInterview({ step: total, completedAt: new Date().toISOString() });
    } else {
      patchInterview({ step: index + 1, completedAt: null });
    }
  }

  function back() {
    patchInterview({ step: Math.max(0, index - 1), completedAt: null });
  }

  function revise(indexToOpen = 0) {
    patchInterview({ step: indexToOpen, completedAt: null });
  }

  function applyPlan() {
    if (!report) return;
    setState((previous) => ({
      ...previous,
      finance: {
        ...previous.finance,
        nextStream: {
          name: report.stream.name,
          monthly: report.stream.monthly,
          ask: report.stream.ask,
          status: report.stream.ask ? "asked" : report.stream.name ? "named" : "blank",
        },
      },
    }));
  }

  return (
    <div className="flex flex-col gap-8 sm:gap-10">
      <section className="flex max-w-3xl flex-col gap-3">
        <a href="/independence" className="inline-flex w-fit items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> Independence
        </a>
        <p className="text-sm tracking-[0.18em] text-faith uppercase">Plan Assistant</p>
        <h1 className="font-heading text-4xl leading-[1.05] text-balance sm:text-5xl">Turn the income gap into a week of work.</h1>
        <p className="text-lg leading-relaxed text-muted-foreground">
          This does not invent a guaranteed business. It asks about skills, people, time, constraints, and recent paid work so the next move is grounded in your real life.
        </p>
      </section>

      {!started ? (
        <Card className="border-faith/30 bg-faith/5">
          <CardHeader className="border-b border-faith/20">
            <CardDescription>Before you start</CardDescription>
            <CardTitle className="font-heading text-2xl">Answer plainly. Skip what you truly do not know.</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 pt-5">
            <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
              There are {total} questions. Your answers stay on this device and can be revised later. The result is a practical plan, not a personality profile.
            </p>
            <button type="button" onClick={() => patchInterview({ step: 0, completedAt: null })} className="inline-flex h-11 w-fit items-center justify-center rounded-lg bg-faith px-5 text-sm font-medium text-white hover:bg-faith/90">
              Start Plan Assistant
            </button>
          </CardContent>
        </Card>
      ) : complete && report ? (
        <Report report={report} onApply={applyPlan} onRevise={revise} answers={interview.answers} />
      ) : question ? (
        <div className="flex flex-col gap-5">
          <div>
            <div className="flex items-baseline justify-between gap-4 text-sm">
              <p className="tracking-[0.16em] text-faith uppercase">{question.section}</p>
              <p className="text-muted-foreground">{index + 1} of {total}</p>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-faith transition-all" style={{ width: `${((index + 1) / total) * 100}%` }} />
            </div>
          </div>

          <Card className="bg-card/80">
            <CardHeader>
              <CardTitle className="font-heading text-2xl leading-tight sm:text-3xl">{question.prompt}</CardTitle>
              <CardDescription className="text-sm leading-relaxed">{question.hint}</CardDescription>
            </CardHeader>
            <CardContent>
              {question.field === "choice" ? (
                <div className="flex flex-col gap-2">
                  {(question.choices ?? []).map((choice) => {
                    const selected = interview.answers[question.id] === choice.value;
                    return (
                      <button
                        key={choice.value}
                        type="button"
                        onClick={() => answer(choice.value)}
                        aria-pressed={selected}
                        className={cn(
                          "rounded-xl border px-4 py-3 text-left text-sm leading-relaxed",
                          selected ? "border-faith/40 bg-faith/10" : "border-border bg-background hover:bg-muted/60"
                        )}
                      >
                        {choice.label}
                      </button>
                    );
                  })}
                </div>
              ) : question.field === "number" ? (
                <Input
                  inputMode="decimal"
                  value={interview.answers[question.id] ?? ""}
                  placeholder={question.placeholder}
                  onChange={(event) => answer(event.target.value)}
                />
              ) : (
                <Textarea
                  rows={5}
                  value={interview.answers[question.id] ?? ""}
                  placeholder={question.placeholder}
                  onChange={(event) => answer(event.target.value)}
                />
              )}
            </CardContent>
          </Card>

          <div className="flex items-center justify-between gap-3">
            <button type="button" onClick={back} disabled={index === 0} className="inline-flex h-11 items-center gap-2 rounded-lg border border-border bg-background px-4 text-sm font-medium hover:bg-muted disabled:opacity-40">
              <ArrowLeft className="size-4" /> Back
            </button>
            <button type="button" onClick={next} className="inline-flex h-11 items-center gap-2 rounded-lg bg-faith px-5 text-sm font-medium text-white hover:bg-faith/90">
              {index === total - 1 ? "Build my plan" : "Next"} <ArrowRight className="size-4" />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Report({
  report,
  onApply,
  onRevise,
  answers,
}: {
  report: ReturnType<typeof deriveCounsel>;
  onApply: () => void;
  onRevise: (index?: number) => void;
  answers: Record<string, string>;
}) {
  return (
    <div className="flex flex-col gap-6">
      <Card className={report.dateHonest ? "border-steward/30 bg-steward/5" : "border-faith/30 bg-faith/5"}>
        <CardHeader className="border-b">
          <CardDescription>Your plan</CardDescription>
          <CardTitle className="font-heading text-2xl sm:text-3xl">{report.honesty}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 pt-5 sm:grid-cols-3">
          <Metric label="Answers" value={`${report.answered}/${report.total}`} />
          <Metric label="Monthly capacity" value={report.monthlyCapacity == null ? "Unknown" : `$${Math.round(report.monthlyCapacity).toLocaleString()}`} />
          <Metric label="Income gap" value={`$${Math.round(report.extraNeeded).toLocaleString()}`} />
        </CardContent>
      </Card>

      <ActionSection title="Do these this week" actions={report.thisWeek} />
      <ActionSection title="Protect the walk" actions={report.walkActions} />
      <ActionSection title="Build the income" actions={report.moneyActions} />

      {report.fences.length > 0 ? (
        <Card className="bg-card/80">
          <CardHeader><CardDescription>Fences</CardDescription><CardTitle className="font-heading text-2xl">Do not cross these to hit a date</CardTitle></CardHeader>
          <CardContent><ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-muted-foreground">{report.fences.map((fence) => <li key={fence}>{fence}</li>)}</ul></CardContent>
        </Card>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <button type="button" onClick={onApply} className="inline-flex h-11 items-center justify-center rounded-lg bg-steward px-5 text-sm font-medium text-white hover:bg-steward/90">Put this plan on Independence</button>
        <a href="/independence" className="inline-flex h-11 items-center justify-center rounded-lg border border-border bg-background px-4 text-sm font-medium hover:bg-muted">Back to Independence</a>
        <button type="button" onClick={() => onRevise(0)} className="inline-flex h-11 items-center justify-center px-4 text-sm font-medium text-muted-foreground underline-offset-4 hover:underline">Revise answers</button>
      </div>

      <details className="rounded-2xl border border-border/80 bg-card/80">
        <summary className="cursor-pointer px-5 py-4 text-sm font-medium">Review individual answers</summary>
        <div className="grid gap-2 border-t border-border/70 p-4 sm:p-5">
          {INTERVIEW_QUESTIONS.map((question, index) => (
            <button key={question.id} type="button" onClick={() => onRevise(index)} className="rounded-xl border border-border/70 p-3 text-left hover:bg-muted/50">
              <p className="text-xs text-muted-foreground">{index + 1}. {question.section}</p>
              <p className="mt-1 text-sm font-medium">{question.prompt}</p>
              <p className="mt-1 truncate text-xs text-muted-foreground">{answers[question.id] || "No answer"}</p>
            </button>
          ))}
        </div>
      </details>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-border/70 bg-background/70 p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="font-heading mt-1 text-xl">{value}</p></div>;
}

function ActionSection({ title, actions }: { title: string; actions: CounselAction[] }) {
  return (
    <section>
      <h2 className="font-heading mb-3 text-2xl">{title}</h2>
      <div className="grid gap-3 lg:grid-cols-3">
        {actions.map((action, index) => (
          <Card key={`${action.title}-${index}`} className="bg-card/80"><CardHeader><CardDescription>{action.kicker}</CardDescription><CardTitle className="font-heading text-xl">{action.title}</CardTitle></CardHeader><CardContent><p className="text-sm leading-relaxed text-muted-foreground">{action.body}</p></CardContent></Card>
        ))}
      </div>
    </section>
  );
}
