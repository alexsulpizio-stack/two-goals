"use client";

import { useMemo, useRef, useState } from "react";
import { FileSpreadsheet, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { todayKey } from "@/lib/dates";
import { formatMoney } from "@/lib/finance";
import {
  displayKind,
  mergeBundles,
  nextKind,
  readDroppedFile,
  summarizeQuicken,
} from "@/lib/quicken";
import type { QuickenBundle, WindowMonths } from "@/lib/quicken";
import type { AppState, LedgerKind } from "@/lib/types";
import { cn } from "@/lib/utils";

export function QuickenImport({
  hydrated,
  state,
  setState,
}: {
  hydrated: boolean;
  state: AppState;
  setState: (updater: (previous: AppState) => AppState) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [bundle, setBundle] = useState<QuickenBundle | null>(null);
  const [windowMonths, setWindowMonths] = useState<WindowMonths>(12);
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [applied, setApplied] = useState(false);

  const summary = useMemo(() => {
    if (!bundle) return null;
    return summarizeQuicken(bundle, windowMonths, state.categoryOverrides);
  }, [bundle, windowMonths, state.categoryOverrides]);

  async function ingestFiles(files: FileList | File[]) {
    const list = [...files].filter(Boolean);
    if (list.length === 0) return;
    setBusy(true);
    setError("");
    setApplied(false);
    try {
      const parsed = await Promise.all(list.map((file) => readDroppedFile(file)));
      const merged = mergeBundles(parsed);
      if (
        merged.transactions.length === 0 &&
        merged.accounts.length === 0
      ) {
        setBundle(merged);
        setError(
          merged.warnings[0] ??
            "Nothing usable was found. Export a QIF file or a CSV report from Quicken."
        );
        return;
      }
      setBundle(merged);
    } catch {
      setError("The file could not be read in this browser.");
      setBundle(null);
    } finally {
      setBusy(false);
    }
  }

  function cycleKind(name: string, kind: LedgerKind) {
    const next = nextKind(kind);
    setState((previous) => ({
      ...previous,
      categoryOverrides: {
        ...previous.categoryOverrides,
        [name]: next,
      },
    }));
    setApplied(false);
  }

  function applyToLedger() {
    if (!summary) return;
    setState((previous) => ({
      ...previous,
      finance: {
        ...previous.finance,
        monthlyIncome: summary.monthlyIncome,
        monthlyExpenses: summary.monthlyExpenses,
        monthlyGiving: summary.monthlyGiving,
        netWorth:
          summary.investedNetWorth ?? previous.finance.netWorth,
      },
      snapshots:
        summary.investedNetWorth != null
          ? [
              { date: todayKey(), netWorth: summary.investedNetWorth },
              ...previous.snapshots.filter((item) => item.date !== todayKey()),
            ]
          : previous.snapshots,
      lastQuicken: {
        fileName: summary.fileName,
        appliedAt: new Date().toISOString(),
        windowMonths: summary.windowMonths,
        transactionCount: summary.transactionCount,
      },
    }));
    setApplied(true);
  }

  const visibleCategories = summary
    ? summary.categories
        .filter((item) => item.kind !== "transfer")
        .slice(0, showAll ? undefined : 12)
    : [];

  return (
    <Card className="bg-card/80">
      <CardHeader className="border-b">
        <CardDescription>Quicken</CardDescription>
        <CardTitle className="font-heading text-2xl">
          Import the books you already keep
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-5 pt-5">
        <p className="text-sm leading-relaxed text-muted-foreground">
          There is no live Quicken login. Export a QIF file, or a Transaction
          and Net Worth report saved as CSV, and drop them here. Parsing stays
          on this device.
        </p>

        <details className="rounded-xl border border-border/80 bg-muted/40 px-4 py-3 text-sm">
          <summary className="cursor-pointer font-medium">
            How to export from Quicken
          </summary>
          <ol className="mt-3 flex list-decimal flex-col gap-2 pl-5 text-muted-foreground">
            <li>
              <span className="text-foreground">Transactions:</span> File →
              File Export → QIF file. Include Transactions, Account List, and
              Category List. Or run a Transaction report and Export to Excel,
              then save as CSV.
            </li>
            <li>
              <span className="text-foreground">Invested net worth:</span>{" "}
              Reports → Net Worth → Export to Excel → save as CSV. House and
              cars are left out of the FI number; cash, brokerages, and
              retirement accounts are included.
            </li>
            <li>
              Drop both files together. Quicken Simplifi: export transactions
              as CSV from settings, same idea.
            </li>
          </ol>
        </details>

        <div
          className={cn(
            "flex flex-col items-center gap-3 rounded-2xl border border-dashed px-4 py-8 text-center transition-colors",
            dragging
              ? "border-steward bg-steward/5"
              : "border-border bg-muted/30"
          )}
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            void ingestFiles(event.dataTransfer.files);
          }}
        >
          <Upload className="size-6 text-steward" />
          <div>
            <p className="font-medium">Drop QIF or CSV files</p>
            <p className="text-sm text-muted-foreground">
              .qif, .csv, or Excel saved as CSV
            </p>
          </div>
          <div className="flex flex-col items-center gap-3">
            <label className="relative inline-flex h-10 cursor-pointer items-center justify-center overflow-hidden rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/80">
              Choose files
              <input
                ref={inputRef}
                type="file"
                accept=".qif,.csv,.txt,.tsv,.qfx,.ofx"
                multiple
                className="absolute inset-0 cursor-pointer opacity-0"
                onChange={(event) => {
                  if (event.target.files) void ingestFiles(event.target.files);
                  event.target.value = "";
                }}
              />
            </label>
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => {
                void loadSample(ingestFiles).catch(() => {
                  setError("The sample files could not be loaded.");
                });
              }}
            >
              <FileSpreadsheet className="size-4" />
              Load sample
            </Button>
          </div>
        </div>

        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}

        {hydrated && state.lastQuicken && !bundle ? (
          <p className="text-sm text-muted-foreground">
            Last applied: {state.lastQuicken.fileName} ·{" "}
            {state.lastQuicken.transactionCount} transactions ·{" "}
            {state.lastQuicken.windowMonths}-month average. Drop a new export
            to refresh.
          </p>
        ) : null}

        {summary && bundle && (bundle.transactions.length > 0 || bundle.accounts.length > 0) ? (
          <div className="flex flex-col gap-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                {summary.fileName} · {summary.transactionCount} transactions
                {summary.startDate && summary.endDate
                  ? ` · ${summary.startDate} to ${summary.endDate}`
                  : ""}
              </p>
              <div className="flex rounded-full border border-border p-1">
                {([3, 12] as WindowMonths[]).map((months) => (
                  <button
                    key={months}
                    type="button"
                    onClick={() => {
                      setWindowMonths(months);
                      setApplied(false);
                    }}
                    className={cn(
                      "rounded-full px-3 py-1 text-sm",
                      windowMonths === months
                        ? "bg-steward text-white"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Last {months} mo
                  </button>
                ))}
              </div>
            </div>

            <dl className="grid gap-3 sm:grid-cols-4">
              <Metric label="Monthly income" value={formatMoney(summary.monthlyIncome)} />
              <Metric label="Monthly living" value={formatMoney(summary.monthlyExpenses)} />
              <Metric label="Monthly giving" value={formatMoney(summary.monthlyGiving)} />
              <Metric
                label="Invested net worth"
                value={
                  summary.investedNetWorth == null
                    ? "Not in file"
                    : formatMoney(summary.investedNetWorth)
                }
              />
            </dl>

            {summary.warnings.map((warning) => (
              <p key={warning} className="text-sm text-muted-foreground">
                {warning}
              </p>
            ))}

            {visibleCategories.length > 0 ? (
              <div className="flex flex-col gap-2">
                <p className="text-sm font-medium">
                  Categories in this window. Click a type to correct it.
                </p>
                <ul className="divide-y rounded-xl border border-border/80">
                  {visibleCategories.map((item) => (
                    <li
                      key={item.name}
                      className="flex items-center justify-between gap-3 px-3 py-2 text-sm"
                    >
                      <span className="min-w-0 flex-1 truncate">{item.name}</span>
                      <span className="tabular-nums text-muted-foreground">
                        {formatMoney(Math.abs(item.total))}
                      </span>
                      <button
                        type="button"
                        onClick={() => cycleKind(item.name, item.kind)}
                        className="w-20 rounded-full border border-border px-2 py-0.5 text-xs hover:border-steward hover:text-steward"
                      >
                        {displayKind(item.kind)}
                      </button>
                    </li>
                  ))}
                </ul>
                {summary.categories.filter((item) => item.kind !== "transfer")
                  .length > 12 ? (
                  <button
                    type="button"
                    className="self-start text-sm underline-offset-4 hover:underline"
                    onClick={() => setShowAll((value) => !value)}
                  >
                    {showAll ? "Show fewer" : "Show all categories"}
                  </button>
                ) : null}
              </div>
            ) : null}

            <Button size="lg" className="self-start" onClick={applyToLedger}>
              {applied ? "Applied to the ledger" : "Apply to the ledger"}
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-muted/50 px-3 py-3">
      <dt className="text-xs tracking-wide text-muted-foreground uppercase">
        {label}
      </dt>
      <dd className="font-heading text-xl">{value}</dd>
    </div>
  );
}

async function loadSample(
  ingest: (files: File[]) => Promise<void>
) {
  const [transactions, netWorth] = await Promise.all([
    fetch("/samples/quicken-transactions.csv").then((response) =>
      response.blob()
    ),
    fetch("/samples/quicken-net-worth.csv").then((response) => response.blob()),
  ]);
  await ingest([
    new File([transactions], "quicken-transactions.csv", { type: "text/csv" }),
    new File([netWorth], "quicken-net-worth.csv", { type: "text/csv" }),
  ]);
}
