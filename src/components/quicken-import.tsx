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
import { Textarea } from "@/components/ui/textarea";
import { todayKey } from "@/lib/dates";
import { formatMoney } from "@/lib/finance";
import {
  displayKind,
  mergeBundles,
  nextKind,
  parseQuickenFile,
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
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [applied, setApplied] = useState(false);
  const [paste, setPaste] = useState("");
  const [selectedNames, setSelectedNames] = useState("");

  const summary = useMemo(() => {
    if (!bundle) return null;
    return summarizeQuicken(bundle, windowMonths, state.categoryOverrides);
  }, [bundle, windowMonths, state.categoryOverrides]);

  async function ingestFiles(files: File[]) {
    const list = files.filter((file) => file && file.size >= 0);
    if (list.length === 0) {
      setError("No file was received. Try the visible file control, or paste the QIF text below.");
      return;
    }
    setBusy(true);
    setError("");
    setApplied(false);
    setSelectedNames(list.map((file) => file.name).join(", "));
    setStatus(`Reading ${list.map((file) => `${file.name} (${Math.max(1, Math.round(file.size / 1024))} KB)`).join(", ")}…`);
    await new Promise((resolve) => window.setTimeout(resolve, 50));
    try {
      const parsed = await Promise.all(list.map((file) => readDroppedFile(file)));
      finishImport(mergeBundles(parsed));
    } catch (cause) {
      setBundle(null);
      setStatus("");
      setError(
        cause instanceof Error
          ? `Could not read the file: ${cause.message}`
          : "The file could not be read in this browser."
      );
    } finally {
      setBusy(false);
    }
  }

  function finishImport(merged: QuickenBundle) {
    setBundle(merged);
    if (merged.transactions.length === 0 && merged.accounts.length === 0) {
      setStatus("");
      setError(
        merged.warnings[0] ??
          "The file opened, but no transactions were found. In Quicken use File → File Export → QIF file and include Transactions."
      );
      return;
    }
    setError("");
    setStatus(
      `Read ${merged.fileName}: ${merged.transactions.length} transaction${
        merged.transactions.length === 1 ? "" : "s"
      }. Scroll this card for the totals, then click Apply to the ledger.`
    );
  }

  function parsePasted() {
    if (!paste.trim()) {
      setError("Paste the contents of your .qif file first.");
      return;
    }
    setBusy(true);
    setApplied(false);
    setSelectedNames("pasted.qif");
    setStatus("Reading pasted QIF…");
    try {
      finishImport(parseQuickenFile("pasted.qif", paste));
    } catch (cause) {
      setBundle(null);
      setStatus("");
      setError(
        cause instanceof Error ? cause.message : "The pasted text could not be parsed."
      );
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
        netWorth: summary.investedNetWorth ?? previous.finance.netWorth,
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
    setStatus("Applied to the ledger. The 6–12 month sprint above now uses these numbers.");
  }

  const visibleCategories = summary
    ? summary.categories
        .filter((item) => item.kind !== "transfer")
        .slice(0, showAll ? undefined : 12)
    : [];

  const showPreview =
    Boolean(summary && bundle && (bundle.transactions.length > 0 || bundle.accounts.length > 0));

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
          Export from Quicken, choose the file, then click <span className="font-medium text-foreground">Read file</span>.
          Totals for that file appear in this card. Then apply them to the ledger.
        </p>

        <details className="rounded-xl border border-border/80 bg-muted/40 px-4 py-3 text-sm">
          <summary className="cursor-pointer font-medium">
            How to export from Quicken
          </summary>
          <ol className="mt-3 flex list-decimal flex-col gap-2 pl-5 text-muted-foreground">
            <li>
              File → File Export → QIF file. Include Transactions, Account
              List, and Category List.
            </li>
            <li>
              Optional for balances: Reports → Net Worth → Export to Excel →
              save as CSV, and choose that file too.
            </li>
          </ol>
        </details>

        <div
          className={cn(
            "flex flex-col items-stretch gap-4 rounded-2xl border border-dashed px-4 py-6 transition-colors",
            dragging ? "border-steward bg-steward/5" : "border-border bg-muted/30"
          )}
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            void ingestFiles([...event.dataTransfer.files]);
          }}
        >
          <div className="flex items-center gap-2 text-sm font-medium">
            <Upload className="size-4 text-steward" />
            Choose a .qif or .csv file
          </div>
          <input
            ref={inputRef}
            type="file"
            accept=".qif,.csv,.txt,.tsv,.QIF,.CSV,text/plain"
            multiple
            disabled={busy}
            className="block w-full max-w-lg cursor-pointer text-sm file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-primary file:px-3 file:py-2 file:text-sm file:font-medium file:text-primary-foreground"
            onChange={() => {
              const files = [...(inputRef.current?.files ?? [])];
              setSelectedNames(files.map((file) => file.name).join(", "));
              void ingestFiles(files);
            }}
          />
          <div className="flex flex-wrap items-center gap-2">
            <Button
              disabled={busy}
              onClick={() => {
                const files = [...(inputRef.current?.files ?? [])];
                if (files.length === 0) {
                  setError("Choose a .qif file first, then click Read file.");
                  return;
                }
                void ingestFiles(files);
              }}
            >
              Read file
            </Button>
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
            {selectedNames ? (
              <p className="text-sm text-muted-foreground">{selectedNames}</p>
            ) : null}
          </div>
          <p className="text-xs text-muted-foreground">
            You can also drop files onto this box, or paste QIF text below. After
            the file name appears next to Choose Files, click Read file.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium">Or paste QIF text</p>
          <Textarea
            value={paste}
            onChange={(event) => setPaste(event.target.value)}
            placeholder={"!Type:Bank\nD3/15'26\nT-52.10\nPStore\nLGroceries\n^"}
            className="min-h-28 font-mono text-xs"
          />
          <Button variant="outline" disabled={busy} onClick={parsePasted} className="self-start">
            Parse pasted QIF
          </Button>
        </div>

        {busy ? (
          <p className="rounded-xl border border-steward/30 bg-steward/5 px-4 py-3 text-sm">
            {status || "Reading…"}
          </p>
        ) : null}

        {status && !busy ? (
          <p
            className="rounded-xl border border-steward/30 bg-steward/5 px-4 py-3 text-sm"
            role="status"
          >
            {status}
          </p>
        ) : null}

        {error ? (
          <p className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}

        {hydrated && state.lastQuicken && !bundle ? (
          <p className="text-sm text-muted-foreground">
            Last applied: {state.lastQuicken.fileName} ·{" "}
            {state.lastQuicken.transactionCount} transactions.
          </p>
        ) : null}

        {showPreview && summary && bundle ? (
          <div className="flex flex-col gap-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                {summary.transactionCount} transactions
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

async function loadSample(ingest: (files: File[]) => Promise<void>) {
  const [transactions, netWorth] = await Promise.all([
    fetch("/samples/quicken-transactions.csv").then((response) => {
      if (!response.ok) throw new Error("Sample transaction file missing");
      return response.blob();
    }),
    fetch("/samples/quicken-net-worth.csv").then((response) => {
      if (!response.ok) throw new Error("Sample net worth file missing");
      return response.blob();
    }),
  ]);
  await ingest([
    new File([transactions], "quicken-transactions.csv", { type: "text/csv" }),
    new File([netWorth], "quicken-net-worth.csv", { type: "text/csv" }),
  ]);
}
