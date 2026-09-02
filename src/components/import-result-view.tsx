"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CategoryKindList } from "@/components/category-kind-list";
import { todayKey } from "@/lib/dates";
import { formatMoney } from "@/lib/finance";
import { nextKind } from "@/lib/quicken";
import type { CompactImport } from "@/lib/quicken/from-form";
import { defaultState, type AppState, type LedgerKind } from "@/lib/types";

const STORAGE_KEY = "two-goals:v1";

export function ImportResultView({ data }: { data: CompactImport }) {
  const router = useRouter();
  const [overrides, setOverrides] = useState<Record<string, LedgerKind>>({});

  const rows = useMemo(
    () =>
      (data.categories ?? []).map((item) => ({
        ...item,
        kind: overrides[item.name] ?? item.kind,
      })),
    [data.categories, overrides]
  );

  const months = Math.max(1, data.monthsCovered ?? 12);
  const periodIncome = sumKind(rows, "income");
  const periodExpenses = sumKind(rows, "expense");
  const periodGiving = sumKind(rows, "giving");
  const monthlyIncome = roundMoney(periodIncome / months);
  const monthlyExpenses = roundMoney(periodExpenses / months);
  const monthlyGiving = roundMoney(periodGiving / months);

  function apply() {
    if (!data.ok) return;
    const previous = readState();
    const next: AppState = {
      ...previous,
      finance: {
        ...previous.finance,
        monthlyIncome,
        monthlyExpenses,
        monthlyGiving,
        netWorth: data.investedNetWorth ?? previous.finance.netWorth,
      },
      categoryOverrides: {
        ...previous.categoryOverrides,
        ...overrides,
      },
      snapshots:
        data.investedNetWorth != null
          ? [
              { date: todayKey(), netWorth: data.investedNetWorth },
              ...previous.snapshots.filter((item) => item.date !== todayKey()),
            ]
          : previous.snapshots,
      lastQuicken: {
        fileName: data.fileName ?? "import.qif",
        appliedAt: new Date().toISOString(),
        windowMonths: 12,
        transactionCount: data.transactionCount ?? 0,
      },
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    router.push("/steward");
    router.refresh();
  }

  if (!data.ok) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col gap-4">
        <p className="text-sm tracking-[0.18em] text-steward uppercase">
          Quicken
        </p>
        <h1 className="font-heading text-4xl">The file did not parse</h1>
        <p className="text-destructive">{data.error}</p>
        <Link href="/steward" className="underline-offset-4 hover:underline">
          Back to Steward
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <section className="flex max-w-3xl flex-col gap-3">
        <p className="text-sm tracking-[0.18em] text-steward uppercase">
          Quicken
        </p>
        <h1 className="font-heading text-4xl">Read {data.fileName}</h1>
        <p className="text-muted-foreground">
          {data.transactionCount} transactions
          {data.startDate && data.endDate
            ? ` · ${data.startDate} to ${data.endDate}`
            : ""}
          . Monthly figures are the totals in that span divided by{" "}
          {data.monthsCovered ?? 12} months — not a single paycheck, and not
          credit-card payments stacked on top of the charges.
        </p>
      </section>

      <Card className="max-w-3xl overflow-visible">
        <CardHeader className="border-b">
          <CardDescription>Preview</CardDescription>
          <CardTitle className="font-heading text-2xl">
            Apply these to the ledger
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 pt-5">
          <dl className="grid gap-3 sm:grid-cols-2">
            <Metric
              label={`Income in span / monthly`}
              value={`${formatMoney(periodIncome)} · ${formatMoney(monthlyIncome)}/mo`}
            />
            <Metric
              label={`Living in span / monthly`}
              value={`${formatMoney(periodExpenses)} · ${formatMoney(monthlyExpenses)}/mo`}
            />
            <Metric
              label={`Giving in span / monthly`}
              value={`${formatMoney(periodGiving)} · ${formatMoney(monthlyGiving)}/mo`}
            />
            <Metric
              label="Invested net worth"
              value={
                data.investedNetWorth == null
                  ? "Not in file — type it on Steward"
                  : formatMoney(data.investedNetWorth)
              }
            />
          </dl>
          <CategoryKindList
            categories={rows}
            onCycle={(name, kind) =>
              setOverrides((previous) => ({
                ...previous,
                [name]: nextKind(kind),
              }))
            }
          />
        </CardContent>
      </Card>

      {data.warnings?.map((warning) => (
        <p key={warning} className="max-w-3xl text-sm text-muted-foreground">
          {warning}
        </p>
      ))}

      <div className="flex flex-wrap gap-3">
        <Button size="lg" onClick={apply}>
          Apply to the ledger
        </Button>
        <Link
          href="/steward"
          className={buttonVariants({ variant: "outline", size: "lg" })}
        >
          Skip for now
        </Link>
      </div>
    </div>
  );
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

function sumKind(
  rows: Array<{ kind: LedgerKind; total: number }>,
  kind: LedgerKind
) {
  return roundMoney(
    rows
      .filter((item) => item.kind === kind)
      .reduce((sum, item) => sum + Math.abs(item.total), 0)
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-muted/50 px-3 py-3">
      <p className="text-xs tracking-wide text-muted-foreground uppercase">
        {label}
      </p>
      <p className="font-heading text-xl">{value}</p>
    </div>
  );
}

function readState(): AppState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState;
    const parsed = JSON.parse(raw) as Partial<AppState>;
    return {
      ...defaultState,
      ...parsed,
      finance: { ...defaultState.finance, ...parsed.finance },
    };
  } catch {
    return defaultState;
  }
}
