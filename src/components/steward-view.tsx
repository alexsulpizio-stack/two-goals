"use client";

import { useMemo, useState } from "react";

import { ProgressRing } from "@/components/mark";
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
import {
  formatDuration,
  formatMoney,
  formatPercent,
  independencePlan,
} from "@/lib/finance";
import type { FinanceInputs } from "@/lib/types";

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
  const [draft, setDraft] = useState<Record<string, string> | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  function financeValue(key: keyof FinanceInputs): string {
    if (draft && key in draft) return draft[key] ?? "";
    const value = state.finance[key];
    return value === 0 ? "" : String(value);
  }

  function commitNumber(key: keyof FinanceInputs, raw: string) {
    const parsed = raw.trim() === "" ? 0 : Number(raw);
    const next = Number.isFinite(parsed) ? parsed : 0;
    setState((previous) => ({
      ...previous,
      finance: { ...previous.finance, [key]: next },
    }));
    setDraft(null);
  }

  function recordSnapshot() {
    const date = todayKey();
    setState((previous) => ({
      ...previous,
      snapshots: [
        { date, netWorth: previous.finance.netWorth },
        ...previous.snapshots.filter((item) => item.date !== date),
      ],
    }));
  }

  const insight = stewardshipInsight(plan, hydrated);

  return (
    <div className="flex flex-col gap-10">
      <section className="flex max-w-3xl flex-col gap-4">
        <p className="text-sm tracking-[0.18em] text-steward uppercase">Goal 02</p>
        <h1 className="font-heading text-4xl leading-[1.1] text-balance sm:text-5xl">
          Live financially independent.
        </h1>
        <p className="text-lg leading-relaxed text-muted-foreground text-pretty">
          The point is not a yacht. The point is freedom to follow — to give,
          to rest, to change work without fear. Your FI number funds the life
          you already intend to live, including generosity.
        </p>
      </section>

      <section className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <Card className="bg-steward text-white ring-0">
          <CardHeader>
            <CardDescription className="text-white/70">
              Path to independence
            </CardDescription>
            <CardTitle className="font-heading text-3xl">
              {!hydrated
                ? "…"
                : plan.reached
                  ? "You can stop working for money"
                  : plan.hasInputs
                    ? formatDuration(plan.monthsRemaining)
                    : "Enter the ledger"}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-5">
            <div className="relative text-white">
              <ProgressRing
                value={hydrated ? plan.progress : 0}
                trackClassName="stroke-white/20"
              />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-heading text-3xl">
                  {hydrated ? Math.round(plan.progress * 100) : 0}%
                </span>
              </div>
            </div>
            <dl className="grid flex-1 gap-3 text-sm">
              <Stat label="FI number" value={formatMoney(plan.fiNumber)} />
              <Stat
                label="Invested now"
                value={formatMoney(state.finance.netWorth)}
              />
              <Stat
                label="Annual life + giving"
                value={formatMoney(plan.annualSpend)}
              />
            </dl>
          </CardContent>
        </Card>

        <div className="grid gap-4 sm:grid-cols-3">
          <MiniStat
            label="Savings rate"
            value={formatPercent(plan.savingsRate)}
            note={
              plan.monthlySavings < 0
                ? "Spending more than you earn"
                : `${formatMoney(plan.monthlySavings)} / month`
            }
          />
          <MiniStat
            label="Giving rate"
            value={formatPercent(plan.givingRate)}
            note={`${formatMoney(plan.annualGiving)} a year`}
          />
          <MiniStat
            label="Safe withdrawal"
            value={`${state.finance.swr}%`}
            note="Default is the 4% rule"
          />
        </div>
      </section>

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
                    inputMode="decimal"
                    className="pl-6"
                    placeholder="0"
                    value={hydrated ? financeValue(field.key) : ""}
                    onChange={(event) =>
                      setDraft((previous) => ({
                        ...(previous ?? {}),
                        [field.key]: event.target.value,
                      }))
                    }
                    onBlur={(event) =>
                      commitNumber(field.key, event.target.value)
                    }
                  />
                </div>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {field.hint}
                </p>
              </div>
            ))}
            <Button onClick={recordSnapshot} variant="outline" className="self-start">
              Record today’s net worth
            </Button>
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
                    : plan.monthsRemaining === null
                      ? " Right now savings and returns are not climbing toward that number."
                      : ` At this pace, that is ${formatDuration(plan.monthsRemaining)}.`}
                </p>
              ) : (
                <p>
                  Add living expenses and giving to see the nest egg that would
                  fund them without a paycheck.
                </p>
              )}
            </div>

            {hydrated && state.snapshots.length > 0 ? (
              <div className="flex flex-col gap-3">
                <p className="text-sm font-medium">Net worth snapshots</p>
                <ul className="flex flex-col gap-2">
                  {state.snapshots.slice(0, 8).map((item) => (
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
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No snapshots yet. Record a net worth when you update the ledger
                so you can watch the climb.
              </p>
            )}
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

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-white/70">{label}</dt>
      <dd className="font-heading text-xl">{value}</dd>
    </div>
  );
}

function MiniStat({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note: string;
}) {
  return (
    <Card className="bg-card/80">
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardTitle className="font-heading text-3xl">{value}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{note}</p>
      </CardContent>
    </Card>
  );
}

function sliderNumber(value: number | readonly number[], fallback: number) {
  if (typeof value === "number") return value;
  return value[0] ?? fallback;
}

function stewardshipInsight(
  plan: ReturnType<typeof independencePlan>,
  hydrated: boolean
) {
  if (!hydrated || !plan.hasInputs) return null;
  if (plan.reached) {
    return "The second goal is in hand. Do not let the portfolio become a master. Seek first the kingdom, and keep giving while you live.";
  }
  if (plan.monthlySavings < 0) {
    return "This month the barn is emptying. Independence recedes until income rises or living costs fall. Giving can stay — cut the rest first.";
  }
  if (plan.givingRate === 0) {
    return "You have a path, but giving is still at zero. A Christian independence plan funds generosity on purpose, not as an afterthought.";
  }
  if (plan.monthsRemaining === null) {
    return "Savings are not yet carrying you toward the number. Raise the gap between earning and spending, then let time work.";
  }
  if (plan.savingsRate >= 0.5) {
    return "A high savings rate is a form of fasting from lifestyle. Keep the kingdom first so the fast does not become an idol.";
  }
  return "Work the plan without worshiping it. Every dollar is on loan from the Lord who gives power to get wealth.";
}
