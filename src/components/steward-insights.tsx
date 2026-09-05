"use client";

import { useMemo } from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAppState } from "@/hooks/use-app-state";
import {
  formatDuration,
  formatMoney,
  independencePlan,
  sprintPlan,
} from "@/lib/finance";
import type { FinanceInputs } from "@/lib/types";

function numberValue(raw: string) {
  const value = Number(raw);
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

function ScenarioCard({
  label,
  finance,
  returnRate,
}: {
  label: string;
  finance: FinanceInputs;
  returnRate: number;
}) {
  const scenario = { ...finance, expectedReturn: returnRate };
  const plan = independencePlan(scenario);
  const sprint = sprintPlan(scenario, scenario.targetMonths);
  return (
    <div className="rounded-xl border border-border/80 bg-background/70 p-4">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="font-heading text-lg">{label}</h3>
        <span className="text-sm tabular-nums text-muted-foreground">{returnRate}% real</span>
      </div>
      <p className="mt-3 font-heading text-2xl tabular-nums">
        {sprint.incomeLift > 0 ? formatMoney(sprint.incomeLift) : "$0"}
      </p>
      <p className="text-xs text-muted-foreground">additional take-home / month</p>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
        {sprint.onTrack
          ? `On track inside ${scenario.targetMonths} months.`
          : plan.monthsRemaining === null
            ? "Current savings do not reach the target without more income."
            : `Current pace: ${formatDuration(plan.monthsRemaining)}.`}
      </p>
    </div>
  );
}

function Trend({ snapshots }: { snapshots: { date: string; netWorth: number }[] }) {
  const points = snapshots.slice(0, 8).reverse();
  if (points.length < 2) {
    return (
      <p className="text-sm text-muted-foreground">
        Save at least two ledger dates to see invested-asset movement here.
      </p>
    );
  }

  const max = Math.max(...points.map((item) => Math.max(0, item.netWorth)), 1);
  const first = points[0]!.netWorth;
  const last = points[points.length - 1]!.netWorth;
  const change = last - first;

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm">
        {change >= 0 ? "Up" : "Down"} {formatMoney(Math.abs(change))} across the saved dates shown.
      </p>
      <div className="flex h-28 items-end gap-2" aria-label="Invested asset history">
        {points.map((point) => {
          const height = Math.max(4, (Math.max(0, point.netWorth) / max) * 100);
          return (
            <div key={point.date} className="flex min-w-0 flex-1 flex-col items-center justify-end gap-1">
              <span className="text-[10px] tabular-nums text-muted-foreground">
                {formatMoney(point.netWorth)}
              </span>
              <div
                className="w-full rounded-t-md bg-steward/70"
                style={{ height: `${height}%` }}
                title={`${point.date}: ${formatMoney(point.netWorth)}`}
              />
              <span className="text-[10px] text-muted-foreground">{point.date.slice(5)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function StewardInsights() {
  const { state, setState } = useAppState();
  const finance = state.finance;
  const plan = useMemo(() => independencePlan(finance), [finance]);
  const sprint = useMemo(
    () => sprintPlan(finance, finance.targetMonths),
    [finance]
  );

  const conservative = Math.max(0, finance.expectedReturn - 3);
  const optimistic = Math.min(10, finance.expectedReturn + 2);

  const saveNumber = (
    key: "cash" | "emergencyReserve" | "debt" | "estimatedTaxRate",
    raw: string
  ) => {
    const value = key === "estimatedTaxRate" ? Math.min(60, numberValue(raw)) : numberValue(raw);
    setState((previous) => ({
      ...previous,
      finance: { ...previous.finance, [key]: value },
    }));
  };

  const headline = !plan.hasInputs
    ? "Enter the life you intend to fund."
    : sprint.reached
      ? "The FI target is already funded."
      : sprint.onTrack
        ? `Protect ${formatMoney(plan.monthlySavings)} of monthly investing.`
        : `Create ${formatMoney(sprint.incomeLift)} more take-home each month.`;

  return (
    <div className="flex flex-col gap-4">
      <Card className="border-steward/30 bg-steward/5">
        <CardHeader className="border-b border-steward/20">
          <CardDescription>Do this next</CardDescription>
          <CardTitle className="font-heading text-2xl sm:text-3xl">{headline}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 pt-5 md:grid-cols-3">
          <div>
            <p className="text-xs tracking-wide text-muted-foreground uppercase">Usable FI capital</p>
            <p className="font-heading text-2xl tabular-nums">{formatMoney(plan.fiCapital)}</p>
            <p className="text-xs text-muted-foreground">investments + cash above reserve − debt</p>
          </div>
          <div>
            <p className="text-xs tracking-wide text-muted-foreground uppercase">Take-home gap</p>
            <p className="font-heading text-2xl tabular-nums">{formatMoney(sprint.incomeLift)}</p>
            <p className="text-xs text-muted-foreground">additional net income / month</p>
          </div>
          <div>
            <p className="text-xs tracking-wide text-muted-foreground uppercase">Approx. gross gap</p>
            <p className="font-heading text-2xl tabular-nums">
              {Number.isFinite(sprint.grossIncomeLift) ? formatMoney(sprint.grossIncomeLift) : "—"}
            </p>
            <p className="text-xs text-muted-foreground">at {finance.estimatedTaxRate}% estimated tax</p>
          </div>
        </CardContent>
      </Card>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card className="bg-card/80">
          <CardHeader className="border-b">
            <CardDescription>Capital safety</CardDescription>
            <CardTitle className="font-heading text-2xl">Cash, reserve, and debt</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 pt-5 sm:grid-cols-2">
            <MoneyInput
              id="fi-cash"
              label="Cash"
              value={finance.cash}
              hint="Only cash above your emergency reserve counts toward FI capital."
              onSave={(raw) => saveNumber("cash", raw)}
            />
            <MoneyInput
              id="fi-reserve"
              label="Emergency reserve"
              value={finance.emergencyReserve}
              hint="Protected cash. It is deliberately excluded from the finish line."
              onSave={(raw) => saveNumber("emergencyReserve", raw)}
            />
            <MoneyInput
              id="fi-debt"
              label="Debt"
              value={finance.debt}
              hint="Debt reduces capital available to fund independence."
              onSave={(raw) => saveNumber("debt", raw)}
            />
            <div className="flex flex-col gap-2">
              <Label htmlFor="fi-tax-rate">Estimated tax on new income</Label>
              <div className="relative">
                <Input
                  id="fi-tax-rate"
                  inputMode="decimal"
                  defaultValue={finance.estimatedTaxRate}
                  onBlur={(event) => saveNumber("estimatedTaxRate", event.target.value)}
                  className="pr-8"
                />
                <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm text-muted-foreground">%</span>
              </div>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Used only to translate the take-home gap into an approximate gross-income target.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/80">
          <CardHeader className="border-b">
            <CardDescription>History</CardDescription>
            <CardTitle className="font-heading text-2xl">Direction, not just today</CardTitle>
          </CardHeader>
          <CardContent className="pt-5">
            <Trend snapshots={state.snapshots} />
          </CardContent>
        </Card>
      </section>

      <Card className="bg-card/80">
        <CardHeader className="border-b">
          <CardDescription>Scenario check</CardDescription>
          <CardTitle className="font-heading text-2xl">Do not trust one return assumption</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 pt-5 md:grid-cols-3">
          <ScenarioCard label="Conservative" finance={finance} returnRate={conservative} />
          <ScenarioCard label="Expected" finance={finance} returnRate={finance.expectedReturn} />
          <ScenarioCard label="Optimistic" finance={finance} returnRate={optimistic} />
        </CardContent>
      </Card>
    </div>
  );
}

function MoneyInput({
  id,
  label,
  value,
  hint,
  onSave,
}: {
  id: string;
  label: string;
  value: number;
  hint: string;
  onSave: (raw: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <span className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-sm text-muted-foreground">$</span>
        <Input
          id={id}
          inputMode="decimal"
          className="pl-6"
          defaultValue={value || ""}
          placeholder="0"
          onBlur={(event) => onSave(event.target.value)}
        />
      </div>
      <p className="text-xs leading-relaxed text-muted-foreground">{hint}</p>
    </div>
  );
}
