"use client";

import { useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { useAppState } from "@/hooks/use-app-state";
import { formatShortDate, todayKey } from "@/lib/dates";
import { SprintBoard } from "@/components/sprint-plan";
import {
  formatDuration,
  formatMoney,
  independencePlan,
  sprintPlan,
} from "@/lib/finance";
import type { FinanceInputs, SprintMonths } from "@/lib/types";

const fields: {
  key: keyof Pick<
    FinanceInputs,
    "netWorth" | "monthlyIncome" | "monthlyExpenses" | "monthlyGiving"
  >;
  label: string;
  hint: string;
}[] = [
  {
    key: "netWorth",
    label: "Invested net worth",
    hint: "What you could live on if work stopped: investments, not your house if you still need to live in it.",
  },
  {
    key: "monthlyIncome",
    label: "Monthly income",
    hint: "Take-home, after tax. The number that actually lands.",
  },
  {
    key: "monthlyExpenses",
    label: "Monthly living expenses",
    hint: "The life you want to fund, not the leanest month you could survive.",
  },
  {
    key: "monthlyGiving",
    label: "Monthly giving",
    hint: "First fruits. Independence that starves generosity is only a bigger barn.",
  },
];

export function StewardView() {
  const { state, setState, hydrated, reset } = useAppState();
  const plan = useMemo(
    () => independencePlan(state.finance),
    [state.finance]
  );
  const sprint = useMemo(
    () => sprintPlan(state.finance, state.finance.targetMonths),
    [state.finance]
  );
  const [draft, setDraft] = useState<Record<string, string> | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [recordNote, setRecordNote] = useState<
    { kind: "saved"; date: string; netWorth: number } | { kind: "empty" } | null
  >(null);
  const lastRecordAt = useRef(0);

  function financeValue(key: keyof FinanceInputs): string {
    if (draft && key in draft) return draft[key] ?? "";
    const value = state.finance[key];
    return value === 0 ? "" : String(value);
  }

  function parseMoney(raw: string | undefined, fallback: number): number {
    if (raw === undefined) return fallback;
    const trimmed = raw.trim();
    if (trimmed === "") return 0;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function commitNumber(key: keyof FinanceInputs, raw: string) {
    const next = parseMoney(raw, 0);
    setState((previous) => ({
      ...previous,
      finance: { ...previous.finance, [key]: next },
    }));
    setDraft((previous) => {
      if (!previous || !(key in previous)) return previous;
      const copy = { ...previous };
      delete copy[key];
      return Object.keys(copy).length ? copy : null;
    });
  }

  function netWorthFromField() {
    if (typeof document === "undefined") return draft?.netWorth ?? "";
    const input = document.getElementById("netWorth");
    return input instanceof HTMLInputElement ? input.value : (draft?.netWorth ?? "");
  }

  function recordSnapshot(rawNetWorth: string) {
    const now = Date.now();
    if (now - lastRecordAt.current < 400) return;
    lastRecordAt.current = now;
    const date = todayKey();
    const trimmed = rawNetWorth.trim();
    if (trimmed === "" && state.finance.netWorth === 0) {
      setRecordNote({ kind: "empty" });
      return;
    }
    const netWorth = parseMoney(trimmed, state.finance.netWorth);
    setRecordNote({ kind: "saved", date, netWorth });
    setDraft((previous) => {
      if (!previous) return previous;
      const copy = { ...previous };
      delete copy.netWorth;
      return Object.keys(copy).length ? copy : null;
    });
    setState((previous) => ({
      ...previous,
      finance: { ...previous.finance, netWorth },
      snapshots: [
        { date, netWorth },
        ...previous.snapshots.filter((item) => item.date !== date),
      ],
    }));
  }

  const insight = stewardshipInsight(plan, sprint, hydrated);
  const snapshots = state.snapshots;

  return (
    <div className="flex flex-col gap-10">
      <section className="flex max-w-3xl flex-col gap-4">
        <p className="text-sm tracking-[0.18em] text-steward uppercase">Goal 02</p>
        <h1 className="font-heading text-4xl leading-[1.1] text-balance sm:text-5xl">
          Independent in the next 6 to 12 months.
        </h1>
        <p className="text-lg leading-relaxed text-muted-foreground text-pretty">
          The point is not a yacht. The point is freedom to follow — to give,
          to rest, to change work without fear. This window is a sprint. Enter
          the ledger by hand. It tells you the surplus, the lump sum, or the
          smaller life that would actually arrive on time.
        </p>
      </section>

      <SprintBoard
        plan={plan}
        sprint={sprint}
        targetMonths={state.finance.targetMonths}
        hasInputs={plan.hasInputs}
        hydrated={hydrated}
        onTargetMonths={(months: SprintMonths) =>
          setState((previous) => ({
            ...previous,
            finance: { ...previous.finance, targetMonths: months },
          }))
        }
      />

      {insight ? (
        <p className="max-w-3xl rounded-2xl border border-steward/20 bg-steward/5 px-5 py-4 text-sm leading-relaxed">
          {insight}
        </p>
      ) : null}

      <section className="grid gap-4 lg:grid-cols-2">
        <Card className="bg-card/80">
          <CardHeader className="border-b">
            <CardDescription>The ledger</CardDescription>
            <CardTitle className="font-heading text-2xl">
              What you have, earn, spend, and give
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-5 pt-5">
            {fields.map((field) => (
              <div key={field.key} className="flex flex-col gap-2">
                <Label htmlFor={field.key}>{field.label}</Label>
                <div className="relative">
                  <span className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-sm text-muted-foreground">
                    $
                  </span>
                  <Input
                    id={field.key}
                    name={field.key}
                    inputMode="decimal"
                    className="pl-6"
                    placeholder="0"
                    value={financeValue(field.key)}
                    suppressHydrationWarning
                    onChange={(event) =>
                      setDraft((previous) => ({
                        ...(previous ?? {}),
                        [field.key]: event.target.value,
                      }))
                    }
                    onBlur={(event) =>
                      commitNumber(field.key, event.target.value)
                    }
                    onKeyDown={
                      field.key === "netWorth"
                        ? (event) => {
                            if (event.key !== "Enter") return;
                            event.preventDefault();
                            recordSnapshot(event.currentTarget.value);
                          }
                        : undefined
                    }
                  />
                </div>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {field.hint}
                </p>
                {field.key === "netWorth" ? (
                  <div className="flex flex-col gap-3 pt-1">
                    <button
                      type="button"
                      className="inline-flex h-10 w-fit items-center justify-center rounded-lg bg-steward px-4 text-sm font-medium text-white hover:bg-steward/90"
                      onPointerDown={() => recordSnapshot(netWorthFromField())}
                      onClick={() => recordSnapshot(netWorthFromField())}
                    >
                      Record today’s net worth
                    </button>
                    {recordNote?.kind === "empty" ? (
                      <p
                        className="rounded-xl border border-border bg-muted/60 px-4 py-3 text-sm"
                        role="status"
                      >
                        Type invested net worth first, then record it.
                      </p>
                    ) : null}
                    {recordNote?.kind === "saved" ? (
                      <p
                        className="rounded-xl border border-steward/30 bg-steward/10 px-4 py-3 text-sm"
                        role="status"
                      >
                        Recorded {formatMoney(recordNote.netWorth)} for{" "}
                        {formatShortDate(recordNote.date)}.
                      </p>
                    ) : null}
                    {snapshots.length > 0 ? (
                      <ul className="flex flex-col gap-2">
                        {snapshots.slice(0, 8).map((item) => (
                          <li
                            key={item.date}
                            className="flex items-baseline justify-between text-sm"
                          >
                            <span className="text-muted-foreground">
                              {formatShortDate(item.date)}
                            </span>
                            <span className="tabular-nums">
                              {formatMoney(item.netWorth)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : recordNote?.kind !== "saved" ? (
                      <p className="text-sm text-muted-foreground">
                        Today’s snapshot appears here so you can watch the climb.
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="bg-card/80">
          <CardHeader className="border-b">
            <CardDescription>Assumptions</CardDescription>
            <CardTitle className="font-heading text-2xl">
              Return and withdrawal
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-8 pt-5">
            <div className="flex flex-col gap-3">
              <div className="flex items-baseline justify-between">
                <Label>Expected real return</Label>
                <span className="font-heading text-lg">
                  {state.finance.expectedReturn}%
                </span>
              </div>
              <Slider
                min={0}
                max={10}
                step={0.5}
                value={[state.finance.expectedReturn]}
                onValueChange={(value) =>
                  setState((previous) => ({
                    ...previous,
                    finance: {
                      ...previous.finance,
                      expectedReturn: sliderNumber(
                        value,
                        previous.finance.expectedReturn
                      ),
                    },
                  }))
                }
              />
              <p className="text-xs text-muted-foreground">
                After inflation. Five percent is a sober long-run stock/bond mix.
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <div className="flex items-baseline justify-between">
                <Label>Safe withdrawal rate</Label>
                <span className="font-heading text-lg">{state.finance.swr}%</span>
              </div>
              <Slider
                min={3}
                max={5}
                step={0.25}
                value={[state.finance.swr]}
                onValueChange={(value) =>
                  setState((previous) => ({
                    ...previous,
                    finance: {
                      ...previous.finance,
                      swr: sliderNumber(value, previous.finance.swr),
                    },
                  }))
                }
              />
              <p className="text-xs text-muted-foreground">
                Four percent is the classic Trinity study rule. Lower is more
                cautious. Your FI number is annual spending divided by this rate.
              </p>
            </div>

            <div className="rounded-xl bg-muted/60 p-4 text-sm leading-relaxed text-muted-foreground">
              {plan.fiNumber > 0 ? (
                <p>
                  To fund {formatMoney(plan.annualSpend)} a year — living plus
                  giving — you need about {formatMoney(plan.fiNumber)} invested.
                  {plan.reached
                    ? " You are there. Keep seeking the kingdom."
                    : sprint.onTrack
                      ? ` At this pace you arrive inside the ${state.finance.targetMonths}-month window.`
                      : plan.monthsRemaining === null
                        ? " Right now savings and returns are not climbing toward that number in time."
                        : ` At this pace that is ${formatDuration(plan.monthsRemaining)} — outside the window. Use the sprint paths above.`}
                </p>
              ) : (
                <p>
                  Add living expenses and giving to see the nest egg that would
                  fund them without a paycheck.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </section>

      <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
        {confirmReset ? (
          <>
            <span>This clears prayers, practices, and money from this browser.</span>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                reset();
                setConfirmReset(false);
                setRecordNote(null);
              }}
            >
              Clear everything
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setConfirmReset(false)}>
              Keep it
            </Button>
          </>
        ) : (
          <button
            type="button"
            className="underline-offset-4 hover:underline"
            onClick={() => setConfirmReset(true)}
          >
            Clear local data
          </button>
        )}
      </div>
    </div>
  );
}

function sliderNumber(value: number | readonly number[], fallback: number) {
  if (typeof value === "number") return value;
  return value[0] ?? fallback;
}

function stewardshipInsight(
  plan: ReturnType<typeof independencePlan>,
  sprint: ReturnType<typeof sprintPlan>,
  hydrated: boolean
) {
  if (!hydrated || !plan.hasInputs) return null;
  if (plan.reached) {
    return "The second goal is in hand. Do not let the portfolio become a master. Seek first the kingdom, and keep giving while you live.";
  }
  if (plan.monthlySavings < 0) {
    return "This month the barn is emptying. A 6–12 month sprint cannot start while living costs outrun income. Giving can stay — cut the rest first.";
  }
  if (plan.givingRate === 0) {
    return "You have a deadline, but giving is still at zero. A Christian sprint funds generosity on purpose, not as an afterthought.";
  }
  if (!sprint.onTrack && sprint.cutsAloneInsufficient) {
    return "Living lean is not enough by itself in this window. The honest remaining doors are more income or a lump sum.";
  }
  if (!sprint.onTrack) {
    return "Work the sprint without worshiping it. Pick one door — surplus, lump sum, or a smaller life — and run it. Every dollar is on loan from the Lord.";
  }
  return "You are inside the window. Keep the kingdom first so the sprint does not become an idol.";
}
