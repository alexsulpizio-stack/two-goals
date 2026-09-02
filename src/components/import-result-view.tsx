"use client";

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
import { todayKey } from "@/lib/dates";
import { formatMoney } from "@/lib/finance";
import { defaultState, type AppState } from "@/lib/types";
import type { CompactImport } from "@/lib/quicken/from-form";

const STORAGE_KEY = "two-goals:v1";

export function ImportResultView({ data }: { data: CompactImport }) {
  const router = useRouter();

  function apply() {
    if (!data.ok) return;
    const previous = readState();
    const next: AppState = {
      ...previous,
      finance: {
        ...previous.finance,
        monthlyIncome: data.monthlyIncome ?? 0,
        monthlyExpenses: data.monthlyExpenses ?? 0,
        monthlyGiving: data.monthlyGiving ?? 0,
        netWorth: data.investedNetWorth ?? previous.finance.netWorth,
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

      <Card className="max-w-3xl">
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
              value={`${formatMoney(data.periodIncome ?? 0)} · ${formatMoney(data.monthlyIncome ?? 0)}/mo`}
            />
            <Metric
              label={`Living in span / monthly`}
              value={`${formatMoney(data.periodExpenses ?? 0)} · ${formatMoney(data.monthlyExpenses ?? 0)}/mo`}
            />
            <Metric
              label={`Giving in span / monthly`}
              value={`${formatMoney(data.periodGiving ?? 0)} · ${formatMoney(data.monthlyGiving ?? 0)}/mo`}
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
