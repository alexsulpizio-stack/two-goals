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
import {
  LEDGER_FIELDS,
  ledgerFromFinance,
  monthlySurplus,
  upsertTodaySnapshot,
  type LedgerSnapshot,
} from "@/lib/ledger";
import { LedgerWhy } from "@/components/ledger-why";
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
    hint: "Starting line. Independence is this number reaching the nest egg the sprint names.",
  },
  {
    key: "monthlyIncome",
    label: "Monthly income",
    hint: "How fast the nest egg can grow. The sprint asks if this, minus living and giving, is enough in time.",
  },
  {
    key: "monthlyExpenses",
    label: "Monthly living expenses",
    hint: "Cuts twice: a bigger life needs a bigger nest egg, and leaves less to invest each month.",
  },
  {
    key: "monthlyGiving",
    label: "Monthly giving",
    hint: "Part of the life you fund, not leftovers. It raises the FI number on purpose.",
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
    { kind: "saved"; snapshot: LedgerSnapshot } | { kind: "empty" } | null
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

  function fieldFromDom(id: (typeof LEDGER_FIELDS)[number], fallback: number) {
    if (typeof document === "undefined") {
      return parseMoney(draft?.[id], fallback);
    }
    const input = document.getElementById(id);
    if (input instanceof HTMLInputElement) {
      return parseMoney(input.value, fallback);
    }
    return parseMoney(draft?.[id], fallback);
  }

  function ledgerFromDom(): LedgerSnapshot {
    const date = todayKey();
    return {
      date,
      netWorth: fieldFromDom("netWorth", state.finance.netWorth),
      monthlyIncome: fieldFromDom("monthlyIncome", state.finance.monthlyIncome),
      monthlyExpenses: fieldFromDom("monthlyExpenses", state.finance.monthlyExpenses),
      monthlyGiving: fieldFromDom("monthlyGiving", state.finance.monthlyGiving),
    };
  }

  function commitNumber(key: keyof FinanceInputs, raw: string) {
    const next = parseMoney(raw, 0);
    setState((previous) => {
      const finance = { ...previous.finance, [key]: next };
      return {
        ...previous,
        finance,
        snapshots: upsertTodaySnapshot(
          previous.snapshots,
          ledgerFromFinance(finance, todayKey())
        ),
      };
    });
    setDraft((previous) => {
      if (!previous || !(key in previous)) return previous;
      const copy = { ...previous };
      delete copy[key];
      return Object.keys(copy).length ? copy : null;
    });
  }

  function recordSnapshot(snapshot = ledgerFromDom()) {
    const now = Date.now();
    if (now - lastRecordAt.current < 400) return;
    lastRecordAt.current = now;
    if (
      snapshot.netWorth === 0 &&
      snapshot.monthlyIncome === 0 &&
      snapshot.monthlyExpenses === 0 &&
      snapshot.monthlyGiving === 0
    ) {
      setRecordNote({ kind: "empty" });
      return;
    }
    setRecordNote({ kind: "saved", snapshot });
    setDraft(null);
    setState((previous) => ({
      ...previous,
      finance: {
        ...previous.finance,
        netWorth: snapshot.netWorth,
        monthlyIncome: snapshot.monthlyIncome,
        monthlyExpenses: snapshot.monthlyExpenses,
        monthlyGiving: snapshot.monthlyGiving,
      },
      snapshots: upsertTodaySnapshot(previous.snapshots, snapshot),
    }));
  }

  const snapshots = state.snapshots;
  const latest = recordNote?.kind === "saved" ? recordNote.snapshot : snapshots[0];
  const surplus = monthlySurplus(state.finance);

  return (
    <div className="flex flex-col gap-10">
      <section className="flex max-w-3xl flex-col gap-4">
        <p className="text-sm tracking-[0.18em] text-steward uppercase">Goal 02</p>
        <h1 className="font-heading text-4xl leading-[1.1] text-balance sm:text-5xl">
          Independent in the next 6 to 12 months.
        </h1>
        <p className="text-lg leading-relaxed text-muted-foreground text-pretty">
          The point is not a yacht. The point is freedom to follow — to give,
          to rest, to change work without fear. The ledger exists to tell you
          whether this month’s surplus, a lump sum, or a smaller life would
          actually arrive on time.
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

      <LedgerWhy
        plan={plan}
        sprint={sprint}
        finance={state.finance}
        snapshots={snapshots}
        hydrated={hydrated}
      />

      <section className="grid gap-4 lg:grid-cols-2">
        <Card className="bg-card/80">
          <CardHeader className="border-b">
            <CardDescription>The ledger</CardDescription>
            <CardTitle className="font-heading text-2xl">
              The numbers the deadline uses
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
                    onKeyDown={(event) => {
                      if (event.key !== "Enter") return;
                      event.preventDefault();
                      recordSnapshot();
                    }}
                  />
                </div>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {field.hint}
                </p>
              </div>
            ))}

            <div className="flex flex-col gap-3 border-t pt-5">
              <p id="ledger-surplus" className="text-sm">
                {state.finance.monthlyIncome > 0 ||
                state.finance.monthlyExpenses > 0 ||
                state.finance.monthlyGiving > 0
                  ? surplus >= 0
                    ? `This month’s surplus: ${formatMoney(surplus)} after living and giving.`
                    : `This month the barn is emptying by ${formatMoney(Math.abs(surplus))}.`
                  : "Income, living, and giving set the monthly surplus the sprint uses."}
              </p>
              <button
                type="button"
                data-record-ledger=""
                className="inline-flex h-10 w-fit items-center justify-center rounded-lg bg-steward px-4 text-sm font-medium text-white hover:bg-steward/90"
                onPointerDown={() => recordSnapshot()}
                onClick={() => recordSnapshot()}
              >
                Save today’s row
              </button>
              <p
                id="ledger-status"
                className="rounded-xl border border-steward/30 bg-steward/10 px-4 py-3 text-sm"
                role="status"
                hidden={recordNote == null && snapshots.length === 0}
              >
                {recordNote?.kind === "empty"
                  ? "Type net worth, income, living, or giving first. Leaving a field also writes today’s history row."
                  : latest
                    ? `Saved ${formatShortDate(latest.date)}: ${formatMoney(latest.netWorth)} net, ${formatMoney(latest.monthlyIncome)} income, ${formatMoney(latest.monthlyExpenses)} living, ${formatMoney(latest.monthlyGiving)} giving.`
                    : null}
              </p>
            </div>
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

      <Card className="bg-card/80">
        <CardHeader className="border-b">
          <CardDescription>History</CardDescription>
          <CardTitle className="font-heading text-2xl">
            Saved on this device
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 pt-5">
          <p id="ledger-save-note" className="text-sm leading-relaxed text-muted-foreground">
            Saved in this browser on this device. Nothing is uploaded. Leaving a
            field writes today’s row. Use Save today’s row to stamp it now.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              data-record-ledger=""
              className="inline-flex h-10 items-center justify-center rounded-lg bg-steward px-4 text-sm font-medium text-white hover:bg-steward/90"
              onPointerDown={() => recordSnapshot()}
              onClick={() => recordSnapshot()}
            >
              Save today’s row
            </button>
            <button
              type="button"
              data-download-ledger=""
              className="inline-flex h-10 items-center justify-center rounded-lg border border-border bg-background px-4 text-sm font-medium hover:bg-muted"
            >
              Download a copy
            </button>
          </div>
          <ul id="ledger-snapshots" className="flex flex-col">
            {snapshots.slice(0, 12).map((item) => (
              <li
                key={item.date}
                className="flex flex-col gap-1 border-b border-border/60 py-2 last:border-0"
              >
                <span className="text-muted-foreground">
                  {formatShortDate(item.date)}
                </span>
                <span className="tabular-nums">
                  {formatMoney(item.netWorth)} net
                </span>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {formatMoney(item.monthlyIncome)} in ·{" "}
                  {formatMoney(item.monthlyExpenses)} living ·{" "}
                  {formatMoney(item.monthlyGiving)} giving
                </span>
              </li>
            ))}
          </ul>
          <p
            id="ledger-history-empty"
            className="text-sm text-muted-foreground"
            hidden={snapshots.length > 0}
          >
            No history yet. Enter the ledger and leave a field, or press Save
            today’s row. Then this list is the trail.
          </p>
        </CardContent>
      </Card>

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
