"use client";

import { useMemo, useState } from "react";
import { ArrowRight, CheckCircle2 } from "lucide-react";

import { QuickenImport } from "@/components/quicken-import";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAppState } from "@/hooks/use-app-state";
import { addMonths, formatMonthYear, todayKey } from "@/lib/dates";
import { formatDuration, formatMoney, formatPercent, independencePlan, sprintPlan } from "@/lib/finance";
import { ledgerFromFinance, upsertTodaySnapshot } from "@/lib/ledger";
import { nextMove } from "@/lib/next-move";
import type { FinanceInputs, SprintMonths, StreamStatus } from "@/lib/types";

const moneyFields: Array<{ key: keyof Pick<FinanceInputs, "netWorth" | "cash" | "emergencyReserve" | "debt" | "monthlyIncome" | "monthlyExpenses" | "monthlyGiving">; label: string; hint: string }> = [
  { key: "netWorth", label: "Invested assets", hint: "Retirement and taxable investment balances that support independence." },
  { key: "cash", label: "Cash", hint: "Checking, savings, money market, and other available cash." },
  { key: "emergencyReserve", label: "Emergency reserve", hint: "Protected cash. This amount is not counted toward the independence finish line." },
  { key: "debt", label: "Debt", hint: "Debt reduces capital available for independence." },
  { key: "monthlyIncome", label: "Monthly take-home income", hint: "What arrives after taxes today." },
  { key: "monthlyExpenses", label: "Monthly living", hint: "The life you actually intend to fund." },
  { key: "monthlyGiving", label: "Monthly giving", hint: "Kept inside the life you intend to fund." },
];

function numeric(raw: string) {
  const value = Number(raw.replace(/[$,]/g, ""));
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

export function IndependenceView() {
  const { state, setState } = useAppState();
  const finance = state.finance;
  const plan = useMemo(() => independencePlan(finance), [finance]);
  const sprint = useMemo(() => sprintPlan(finance, finance.targetMonths), [finance]);
  const move = useMemo(() => nextMove(plan, sprint, finance), [plan, sprint, finance]);
  const [saved, setSaved] = useState(false);
  const deadline = formatMonthYear(addMonths(new Date(), finance.targetMonths));

  function updateFinance(patch: Partial<FinanceInputs>, snapshot = false) {
    setState((previous) => {
      const nextFinance = { ...previous.finance, ...patch };
      if (patch.monthlyIncome !== undefined) {
        nextFinance.incomeSources = [{ id: "income-total", name: "Current income", monthly: patch.monthlyIncome }];
      }
      return {
        ...previous,
        finance: nextFinance,
        snapshots: snapshot
          ? upsertTodaySnapshot(previous.snapshots, ledgerFromFinance(nextFinance, todayKey()))
          : previous.snapshots,
      };
    });
  }

  function recordToday() {
    setState((previous) => ({
      ...previous,
      snapshots: upsertTodaySnapshot(previous.snapshots, ledgerFromFinance(previous.finance, todayKey())),
    }));
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2200);
  }

  const remaining = Math.max(0, plan.fiNumber - plan.fiCapital);
  const grossGap = Number.isFinite(sprint.grossIncomeLift) ? formatMoney(sprint.grossIncomeLift) : "—";

  return (
    <div className="flex flex-col gap-8 sm:gap-10">
      <section className="flex max-w-3xl flex-col gap-3">
        <p className="text-sm tracking-[0.18em] text-steward uppercase">Goal 02 · Independence</p>
        <h1 className="font-heading text-4xl leading-[1.05] text-balance sm:text-5xl">Know the number. Close the gap.</h1>
        <p className="text-lg leading-relaxed text-muted-foreground">
          Two Goals reduces the financial plan to four questions: what do you need, what do you have, what is the gap, and what should you do next?
        </p>
      </section>

      <section className="rounded-3xl bg-steward p-5 text-white sm:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs tracking-[0.2em] text-white/70 uppercase">Your target</p>
            <h2 className="font-heading mt-2 text-3xl leading-tight sm:text-4xl">
              {plan.hasInputs ? `Independent by ${deadline}` : "Start with your real numbers"}
            </h2>
          </div>
          <div className="flex rounded-full bg-white/10 p-1">
            {([6, 12] as SprintMonths[]).map((months) => (
              <button
                key={months}
                type="button"
                onClick={() => updateFinance({ targetMonths: months })}
                className={`rounded-full px-4 py-2 text-sm ${finance.targetMonths === months ? "bg-white text-steward" : "text-white/80 hover:text-white"}`}
              >
                {months} months
              </button>
            ))}
          </div>
        </div>

        <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <HeroMetric label="Need" value={plan.fiNumber > 0 ? formatMoney(plan.fiNumber) : "—"} />
          <HeroMetric label="Have" value={plan.hasInputs ? formatMoney(plan.fiCapital) : "—"} />
          <HeroMetric label="Gap" value={plan.fiNumber > 0 ? formatMoney(remaining) : "—"} />
          <HeroMetric label="Progress" value={plan.fiNumber > 0 ? `${Math.round(plan.progress * 100)}%` : "—"} />
        </div>

        <div className="mt-6 rounded-2xl border border-white/20 bg-white/10 p-5">
          <p className="text-xs tracking-[0.18em] text-white/70 uppercase">Next action</p>
          <p className="font-heading mt-2 text-2xl leading-tight">{plan.hasInputs ? move.headline : "Enter your baseline below."}</p>
          {plan.hasInputs && move.lines[0] ? <p className="mt-2 text-sm leading-relaxed text-white/80">{move.lines[0]}</p> : null}
        </div>
      </section>

      {plan.hasInputs ? (
        <section className="grid gap-4 md:grid-cols-3">
          <SummaryCard label="Current monthly savings" value={formatMoney(plan.monthlySavings)} note={`${formatPercent(plan.savingsRate)} of take-home`} />
          <SummaryCard label="Additional take-home needed" value={formatMoney(sprint.incomeLift)} note={`Approx. ${grossGap} gross at ${finance.estimatedTaxRate}% tax`} />
          <SummaryCard label="Current pace" value={formatDuration(plan.monthsRemaining)} note={sprint.onTrack ? `Inside the ${finance.targetMonths}-month target` : `Outside the ${finance.targetMonths}-month target`} />
        </section>
      ) : null}

      <Card className="bg-card/80">
        <CardHeader className="border-b">
          <CardDescription>1 · Your numbers</CardDescription>
          <CardTitle className="font-heading text-2xl">Give the model a trustworthy baseline</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 pt-5 sm:grid-cols-2 lg:grid-cols-3">
          {moneyFields.map((field) => (
            <MoneyField
              key={field.key}
              id={`independence-${field.key}`}
              label={field.label}
              hint={field.hint}
              value={finance[field.key] as number}
              onSave={(value) => updateFinance({ [field.key]: value } as Partial<FinanceInputs>)}
            />
          ))}
          <div className="flex items-end">
            <button type="button" onClick={recordToday} className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-border bg-background px-4 text-sm font-medium hover:bg-muted">
              {saved ? <CheckCircle2 className="size-4 text-steward" /> : null}
              {saved ? "Snapshot saved" : "Save today’s snapshot"}
            </button>
          </div>
        </CardContent>
      </Card>

      <details className="rounded-2xl border border-border/80 bg-card/80">
        <summary className="cursor-pointer px-5 py-4 font-medium">Import from Quicken Classic</summary>
        <div className="border-t border-border/70 p-4 sm:p-5">
          <QuickenImport />
        </div>
      </details>

      <Card className="bg-card/80">
        <CardHeader className="border-b">
          <CardDescription>2 · Your income plan</CardDescription>
          <CardTitle className="font-heading text-2xl">
            {sprint.incomeLift > 0 ? `Close ${formatMoney(sprint.incomeLift)} per month` : "Protect the path you already have"}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 pt-5 lg:grid-cols-2">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="income-plan-name">Next income source</Label>
              <Input
                id="income-plan-name"
                defaultValue={finance.nextStream.name}
                placeholder="Consulting, overtime, bookkeeping, weekend work..."
                onBlur={(event) => updateFinance({ nextStream: { ...finance.nextStream, name: event.target.value.trim(), status: event.target.value.trim() ? finance.nextStream.status === "blank" ? "named" : finance.nextStream.status : "blank" } })}
              />
            </div>
            <MoneyField
              id="income-plan-monthly"
              label="Monthly amount this source should create"
              hint="Use the gap above as the starting point, then adjust to what is realistic."
              value={finance.nextStream.monthly || sprint.incomeLift}
              onSave={(value) => updateFinance({ nextStream: { ...finance.nextStream, monthly: value } })}
            />
            <div className="flex flex-col gap-2">
              <Label htmlFor="income-plan-ask">This week’s ask</Label>
              <Textarea
                id="income-plan-ask"
                defaultValue={finance.nextStream.ask}
                placeholder="Who will you ask, for what, and by when?"
                onBlur={(event) => updateFinance({ nextStream: { ...finance.nextStream, ask: event.target.value.trim(), status: event.target.value.trim() ? "asked" : finance.nextStream.status } })}
              />
            </div>
          </div>

          <div className="flex flex-col justify-between gap-5 rounded-2xl border border-faith/25 bg-faith/5 p-5">
            <div>
              <p className="text-xs tracking-[0.18em] text-faith uppercase">Need help finding the income?</p>
              <h3 className="font-heading mt-2 text-2xl">Use the Plan Assistant.</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                It asks about your actual skills, people, available hours, constraints, and recent paid work, then turns those answers into a concrete week.
              </p>
            </div>
            <a href="/counsel" className="inline-flex w-fit items-center gap-2 text-sm font-medium text-faith underline-offset-4 hover:underline">
              Open Plan Assistant <ArrowRight className="size-4" />
            </a>
          </div>
        </CardContent>
      </Card>

      <details className="rounded-2xl border border-border/80 bg-card/80">
        <summary className="cursor-pointer px-5 py-4 font-medium">Advanced assumptions</summary>
        <div className="grid gap-5 border-t border-border/70 p-5 sm:grid-cols-3">
          <PercentField label="Expected real return" value={finance.expectedReturn} onSave={(value) => updateFinance({ expectedReturn: value })} />
          <PercentField label="Withdrawal rate" value={finance.swr} onSave={(value) => updateFinance({ swr: value })} />
          <PercentField label="Estimated tax on new income" value={finance.estimatedTaxRate} onSave={(value) => updateFinance({ estimatedTaxRate: value })} />
        </div>
      </details>

      {state.snapshots.length > 0 ? (
        <Card className="bg-card/80">
          <CardHeader className="border-b">
            <CardDescription>3 · Progress</CardDescription>
            <CardTitle className="font-heading text-2xl">Recent snapshots</CardTitle>
          </CardHeader>
          <CardContent className="pt-5">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[36rem] text-sm">
                <thead className="text-left text-muted-foreground">
                  <tr><th className="pb-3 font-medium">Date</th><th className="pb-3 font-medium">Investments</th><th className="pb-3 font-medium">Income</th><th className="pb-3 font-medium">Living</th><th className="pb-3 font-medium">Giving</th></tr>
                </thead>
                <tbody>
                  {state.snapshots.slice(0, 8).map((snapshot) => (
                    <tr key={snapshot.date} className="border-t border-border/60">
                      <td className="py-3">{snapshot.date}</td>
                      <td className="py-3 tabular-nums">{formatMoney(snapshot.netWorth)}</td>
                      <td className="py-3 tabular-nums">{formatMoney(snapshot.monthlyIncome)}</td>
                      <td className="py-3 tabular-nums">{formatMoney(snapshot.monthlyExpenses)}</td>
                      <td className="py-3 tabular-nums">{formatMoney(snapshot.monthlyGiving)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function HeroMetric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl bg-white/10 p-4"><p className="text-xs text-white/65">{label}</p><p className="font-heading mt-1 text-2xl tabular-nums">{value}</p></div>;
}

function SummaryCard({ label, value, note }: { label: string; value: string; note: string }) {
  return <div className="rounded-2xl border border-border/80 bg-card/80 p-5"><p className="text-xs tracking-wide text-muted-foreground uppercase">{label}</p><p className="font-heading mt-2 text-2xl tabular-nums">{value}</p><p className="mt-1 text-xs text-muted-foreground">{note}</p></div>;
}

function MoneyField({ id, label, hint, value, onSave }: { id: string; label: string; hint: string; value: number; onSave: (value: number) => void }) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative"><span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-muted-foreground">$</span><Input id={id} inputMode="decimal" className="pl-7" defaultValue={value || ""} placeholder="0" onBlur={(event) => onSave(numeric(event.target.value))} /></div>
      <p className="text-xs leading-relaxed text-muted-foreground">{hint}</p>
    </div>
  );
}

function PercentField({ label, value, onSave }: { label: string; value: number; onSave: (value: number) => void }) {
  const id = `advanced-${label.toLowerCase().replace(/[^a-z]+/g, "-")}`;
  return <div className="flex flex-col gap-2"><Label htmlFor={id}>{label}</Label><div className="relative"><Input id={id} inputMode="decimal" defaultValue={value} className="pr-8" onBlur={(event) => onSave(Math.min(95, numeric(event.target.value)))} /><span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm text-muted-foreground">%</span></div></div>;
}
