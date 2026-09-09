"use client";

import { useEffect, useMemo, useState } from "react";
import { Bot, ExternalLink, LockKeyhole, Send, ShieldCheck } from "lucide-react";

import { useAppState } from "@/hooks/use-app-state";
import { todayKey } from "@/lib/dates";
import { independencePlan, sprintPlan } from "@/lib/finance";

type GuideError = {
  message: string;
  code?: string;
  setupUrl?: string;
  alternative?: string;
};

type AccessStatus = {
  required: boolean;
  configured: boolean;
  authorized: boolean;
};

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
  const [error, setError] = useState<GuideError | null>(null);
  const [loading, setLoading] = useState(false);
  const [includePlanAnswers, setIncludePlanAnswers] = useState(false);
  const [access, setAccess] = useState<AccessStatus | null>(null);
  const [password, setPassword] = useState("");
  const [unlocking, setUnlocking] = useState(false);
  const [unlockError, setUnlockError] = useState("");

  useEffect(() => {
    let cancelled = false;

    void fetch("/api/guide/access", { cache: "no-store" })
      .then(async (response) => {
        const data = (await response.json()) as AccessStatus;
        if (!cancelled) setAccess(data);
      })
      .catch(() => {
        if (!cancelled) {
          setAccess({ required: true, configured: false, authorized: false });
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

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
      planAssistant: includePlanAnswers
        ? state.interview
        : { completedAt: state.interview.completedAt },
      recentSnapshots: state.snapshots.slice(0, 6),
      extraContext: extraContext ?? null,
    };
  }, [state, includePlanAnswers, extraContext]);

  async function unlock() {
    if (!password || unlocking) return;
    setUnlocking(true);
    setUnlockError("");

    try {
      const response = await fetch("/api/guide/access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = (await response.json()) as {
        authorized?: boolean;
        error?: string;
      };

      if (!response.ok || !data.authorized) {
        setUnlockError(data.error || "Guide could not be unlocked.");
        return;
      }

      setPassword("");
      setAccess((previous) => ({
        required: previous?.required ?? true,
        configured: true,
        authorized: true,
      }));
    } catch {
      setUnlockError("Guide could not be unlocked.");
    } finally {
      setUnlocking(false);
    }
  }

  async function ask(nextQuestion?: string) {
    const prompt = (nextQuestion ?? question).trim();
    if (!prompt || loading) return;

    setQuestion(prompt);
    setLoading(true);
    setError(null);
    setAnswer("");

    try {
      const response = await fetch("/api/guide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: prompt, context }),
      });

      const data = (await response.json()) as {
        answer?: string;
        error?: string;
        code?: string;
        setupUrl?: string;
        alternative?: string;
      };

      if (!response.ok) {
        if (data.code === "guide_locked") {
          setAccess((previous) => ({
            required: true,
            configured: previous?.configured ?? true,
            authorized: false,
          }));
        }
        setError({
          message: data.error || "Guide could not answer.",
          code: data.code,
          setupUrl: data.setupUrl,
          alternative: data.alternative,
        });
        return;
      }

      setAnswer(data.answer || "");
    } catch (caught) {
      setError({
        message:
          caught instanceof Error ? caught.message : "Guide could not answer.",
      });
    } finally {
      setLoading(false);
    }
  }

  const locked = Boolean(access?.required && !access.authorized);

  return (
    <section className="overflow-hidden rounded-3xl border border-faith/25 bg-card/90">
      <div className="flex flex-col gap-3 border-b border-border/70 bg-faith/5 p-5 sm:flex-row sm:items-start sm:justify-between sm:p-6">
        <div className="flex gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-faith text-white">
            <Bot className="size-5" />
          </span>
          <div>
            <p className="text-xs tracking-[0.18em] text-faith uppercase">
              AI direction
            </p>
            <h2 className="font-heading mt-1 text-2xl">{title}</h2>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              {description}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="size-4 text-faith" /> Private Guide session
        </div>
      </div>

      <div className="flex flex-col gap-5 p-5 sm:p-6">
        {access === null ? (
          <p role="status" className="text-sm text-muted-foreground">
            Checking Guide access…
          </p>
        ) : locked ? (
          <div className="rounded-2xl border border-border bg-background p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted">
                <LockKeyhole className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="font-medium">Guide is locked</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  Enter the private Guide password. A successful unlock is remembered
                  on this browser for 30 days using an HttpOnly cookie.
                </p>

                {!access.configured ? (
                  <p className="mt-3 rounded-lg border border-destructive/25 bg-destructive/5 p-3 text-sm text-destructive">
                    Guide access has not been configured on the server yet. Add a
                    GUIDE_ACCESS_PASSWORD environment variable with at least 12 characters.
                  </p>
                ) : (
                  <div className="mt-4 flex max-w-md gap-2">
                    <input
                      type="password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") void unlock();
                      }}
                      autoComplete="current-password"
                      placeholder="Guide access password"
                      className="min-w-0 flex-1 rounded-xl border border-input bg-background px-3 py-2.5 text-sm"
                    />
                    <button
                      type="button"
                      disabled={unlocking || !password}
                      onClick={() => void unlock()}
                      className="rounded-xl bg-faith px-4 py-2.5 text-sm font-semibold text-white hover:bg-faith/90 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {unlocking ? "Unlocking…" : "Unlock"}
                    </button>
                  </div>
                )}

                {unlockError ? (
                  <p role="alert" className="mt-3 text-sm text-destructive">
                    {unlockError}
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        ) : (
          <>
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
              Include my Plan Assistant answers. Off by default because those answers
              may be more personal. Prayer-journal text is never sent by this Guide.
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

            {loading ? (
              <p role="status" className="text-sm text-muted-foreground">
                Guide is thinking…
              </p>
            ) : null}

            {error ? (
              <div
                role="alert"
                className="rounded-xl border border-destructive/25 bg-destructive/5 p-4 text-sm leading-relaxed text-destructive"
              >
                <p className="font-medium">{error.message}</p>

                {error.code === "gateway_billing_required" ? (
                  <div className="mt-3 flex flex-col gap-3">
                    {error.setupUrl ? (
                      <a
                        href={error.setupUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex w-fit items-center gap-2 rounded-lg bg-faith px-3 py-2 text-xs font-semibold text-white hover:bg-faith/90"
                      >
                        Enable Vercel AI Gateway
                        <ExternalLink className="size-3.5" aria-hidden="true" />
                      </a>
                    ) : null}
                    {error.alternative ? (
                      <p className="max-w-3xl text-xs text-foreground/75">
                        {error.alternative}
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : null}

            {answer ? (
              <div className="rounded-2xl border border-border/80 bg-background p-4 sm:p-5">
                <p className="text-xs tracking-[0.16em] text-faith uppercase">
                  Guide
                </p>
                <div className="mt-2 whitespace-pre-wrap text-sm leading-7 text-foreground">
                  {answer}
                </div>
              </div>
            ) : null}
          </>
        )}

        <p className="text-xs leading-relaxed text-muted-foreground">
          Guide is for planning and explanation, not professional financial, tax,
          legal, or investment advice. AI can be wrong; verify material decisions.
        </p>
      </div>
    </section>
  );
}
