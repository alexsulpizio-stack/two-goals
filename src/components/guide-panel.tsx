"use client";

import { useMemo, useState } from "react";
import { Bot, Send, ShieldCheck } from "lucide-react";

import { useAppState } from "@/hooks/use-app-state";
import { independencePlan, sprintPlan } from "@/lib/finance";
import { todayKey } from "@/lib/dates";

export function GuidePanel({
  title = "Guide",
  description = "Ask for direction using the numbers already in Two Goals.",
  extraContext,
  starters = [
    "What should I do next?",
    "Explain why my income gap is this large.",
    "Challenge my assumptions. What looks unrealistic?",
    "What would improve my 12-month path the most?",
  ],
}: {
  title?: string;
  description?: string;
  extraContext?: unknown;
  starters?: string[];
}) {
  const { state } = useAppState();
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [includePlanAnswers, setIncludePlanAnswers] = useState(false);

  const context = useMemo(() => {
    const plan = independencePlan(state.finance);
    const sprint = sprintPlan(state.finance, state.finance.targetMonths);
    const practice = state.practices[todayKey()];
    return {
      finance: {
        inputs: state.finance,
        calculated: {
          independenceTarget: plan.fiNumber,
          usableCapital: plan.fiCapital,
          progress: plan.progress,
          monthlySavings: plan.monthlySavings,
          monthsRemaining: plan.monthsRemaining,
          targetMonths: state.finance.targetMonths,
          additionalTakeHomeNeeded: sprint.incomeLift,
          estimatedGrossIncomeNeeded: sprint.grossIncomeLift,
          onTrack: sprint.onTrack,
        },
      },
      today: {
        word: Boolean(practice?.word),
        prayer: Boolean(practice?.prayer),
        gathered: Boolean(practice?.gathered),
        neighbor: Boolean(practice?.neighbor),
      },
      planAssistant: includePlanAnswers ? state.interview : { completedAt: state.interview.completedAt },
      recentSnapshots: state.snapshots.slice(0, 6),
      extraContext: extraContext ?? null,
    };
  }, [state, includePlanAnswers, extraContext]);

  async function ask(nextQuestion?: string) {
    const prompt = (nextQuestion ?? question).trim();
    if (!prompt || loading) return;
    setQuestion(prompt);
    setLoading(true);
    setError("");
    setAnswer("");
    try {
      const response = await fetch("/api/guide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: prompt, context }),
      });
      const data = (await response.json()) as { answer?: string; error?: string; code?: string };
      if (!response.ok) throw new Error(data.error || "Guide could not answer.");
      setAnswer(data.answer || "");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Guide could not answer.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="overflow-hidden rounded-3xl border border-faith/25 bg-card/90">
      <div className="flex flex-col gap-3 border-b border-border/70 bg-faith/5 p-5 sm:flex-row sm:items-start sm:justify-between sm:p-6">
        <div className="flex gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-faith text-white">
            <Bot className="size-5" />
          </span>
          <div>
            <p className="text-xs tracking-[0.18em] text-faith uppercase">AI direction</p>
            <h2 className="font-heading mt-1 text-2xl">{title}</h2>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">{description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="size-4 text-faith" /> Structured context only
        </div>
      </div>

      <div className="flex flex-col gap-5 p-5 sm:p-6">
        <div className="flex flex-wrap gap-2">
          {starters.map((starter) => (
            <button
              key={starter}
              type="button"
              onClick={() => void ask(starter)}
              className="rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium hover:bg-muted"
            >
              {starter}
            </button>
          ))}
        </div>

        <label className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
          <input
            type="checkbox"
            checked={includePlanAnswers}
            onChange={(event) => setIncludePlanAnswers(event.target.checked)}
            className="mt-0.5 size-4"
          />
          Include my Plan Assistant answers. Off by default because those answers may be more personal. Prayer-journal text is never sent by this Guide.
        </label>

        <div className="flex gap-2">
          <textarea
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void ask();
              }
            }}
            rows={3}
            placeholder="Ask Guide what to do next, why a number changed, or which assumption deserves attention..."
            className="min-h-24 flex-1 resize-y rounded-xl border border-input bg-background px-3 py-2.5 text-sm leading-relaxed"
          />
          <button
            type="button"
            aria-label="Ask Guide"
            disabled={loading || !question.trim()}
            onClick={() => void ask()}
            className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-faith text-white hover:bg-faith/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Send className="size-4" />
          </button>
        </div>

        {loading ? <p role="status" className="text-sm text-muted-foreground">Guide is thinking…</p> : null}
        {error ? (
          <div role="alert" className="rounded-xl border border-destructive/25 bg-destructive/5 p-4 text-sm leading-relaxed text-destructive">
            {error}
          </div>
        ) : null}
        {answer ? (
          <div className="rounded-2xl border border-border/80 bg-background p-4 sm:p-5">
            <p className="text-xs tracking-[0.16em] text-faith uppercase">Guide</p>
            <div className="mt-2 whitespace-pre-wrap text-sm leading-7 text-foreground">{answer}</div>
          </div>
        ) : null}

        <p className="text-xs leading-relaxed text-muted-foreground">
          Guide is for planning and explanation, not professional financial, tax, legal, or investment advice. AI can be wrong; verify material decisions.
        </p>
      </div>
    </section>
  );
}
