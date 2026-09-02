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
import { todayKey } from "@/lib/dates";
import { formatMoney } from "@/lib/finance";
import { displayKind, nextKind, retotalSummary } from "@/lib/quicken";
import type { QuickenSummary, WindowMonths } from "@/lib/quicken";
import type { AppState, LedgerKind } from "@/lib/types";
import { cn } from "@/lib/utils";

type ImportResponse = {
  ok: boolean;
  error?: string;
  fileName?: string;
  transactionCount?: number;
  byWindow?: {
    3: QuickenSummary;
    12: QuickenSummary;
  };
};

export function QuickenImport({
  hydrated,
  state,
  setState,
}: {
  hydrated: boolean;
  state: AppState;
  setState: (updater: (previous: AppState) => AppState) => void;
}) {
  const noteRef = useRef<HTMLParagraphElement>(null);
  const [windowMonths, setWindowMonths] = useState<WindowMonths>(12);
  const [payload, setPayload] = useState<ImportResponse | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [applied, setApplied] = useState(false);
  const [pending, setPending] = useState(false);

  const rawSummary = payload?.ok ? payload.byWindow?.[windowMonths] ?? null : null;
  const summary = useMemo(() => {
    if (!rawSummary) return null;
    return retotalSummary(rawSummary, state.categoryOverrides);
  }, [rawSummary, state.categoryOverrides]);

  function note(text: string) {
    if (noteRef.current) noteRef.current.textContent = text;
  }

  async function submitForm(form: HTMLFormElement) {
    note("Read file clicked. Uploading to the parser…");
    setPending(true);
    setApplied(false);
    try {
      const body = new FormData(form);
      const file = body.get("quicken");
      const paste = String(body.get("paste") ?? "").trim();
      if (!(file instanceof File && file.size > 0) && !paste) {
        const message =
          "The form did not receive a file. Choose 2025data again, then click Read file.";
        note(message);
        setPayload({ ok: false, error: message });
        return;
      }
      if (file instanceof File && file.size > 0) {
        note(`Uploading ${file.name} (${Math.max(1, Math.round(file.size / 1024))} KB)…`);
      }
      const response = await fetch("/api/quicken", { method: "POST", body });
      const data = (await response.json()) as ImportResponse;
      setPayload(data);
      if (data.ok) {
        note(
          `Read ${data.fileName}: ${data.transactionCount} transactions. Totals are below. Click Apply to the ledger.`
        );
      } else {
        note(data.error ?? "The file could not be parsed.");
      }
    } catch (cause) {
      const message =
        cause instanceof Error ? cause.message : "The upload failed.";
      note(message);
      setPayload({ ok: false, error: message });
    } finally {
      setPending(false);
    }
  }

  function cycleKind(name: string, kind: LedgerKind) {
    setState((previous) => ({
      ...previous,
      categoryOverrides: {
        ...previous.categoryOverrides,
        [name]: nextKind(kind),
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
    note("Applied to the ledger. The 6–12 month sprint now uses these numbers.");
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
          Choose your .qif, then press <span className="font-medium text-foreground">Read file</span>.
          A status line will appear directly under that button even if parsing fails.
        </p>

        <form
          className="flex flex-col gap-4 rounded-2xl border border-dashed border-border bg-muted/30 px-4 py-6"
          action="/api/quicken"
          method="post"
          encType="multipart/form-data"
          onSubmit={(event) => {
            event.preventDefault();
            void submitForm(event.currentTarget);
          }}
        >
          <label className="flex flex-col gap-2 text-sm font-medium">
            File
            <input
              type="file"
              name="quicken"
              accept=".qif,.csv,.txt,.tsv,.QIF,.CSV,text/plain"
              className="block w-full cursor-pointer text-sm file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-primary file:px-3 file:py-2 file:text-sm file:font-medium file:text-primary-foreground"
            />
          </label>
          <button
            type="submit"
            className="inline-flex h-10 w-fit items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/80"
          >
            {pending ? "Reading…" : "Read file"}
          </button>
          <p
            ref={noteRef}
            className="min-h-6 text-sm text-foreground"
            role="status"
          >
            Waiting for a file.
          </p>
          <label className="flex flex-col gap-2 text-sm font-medium">
            Or paste QIF text
            <textarea
              name="paste"
              rows={6}
              className="w-full rounded-lg border border-input bg-background px-2.5 py-2 font-mono text-xs"
              placeholder={"!Type:Bank\nD3/15'26\nT-52.10\nPStore\nLGroceries\n^"}
            />
          </label>
        </form>

        {payload?.ok === false ? (
          <p className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {payload.error}
          </p>
        ) : null}

        {hydrated && state.lastQuicken && !payload?.ok ? (
          <p className="text-sm text-muted-foreground">
            Last applied: {state.lastQuicken.fileName} ·{" "}
            {state.lastQuicken.transactionCount} transactions.
          </p>
        ) : null}

        {summary ? (
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
