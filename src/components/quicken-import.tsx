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
import {
  parseQuickenSources,
  type ImportResult,
} from "@/lib/quicken/from-form";
import type { WindowMonths } from "@/lib/quicken";
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
  const fileRef = useRef<HTMLInputElement>(null);
  const pasteRef = useRef<HTMLTextAreaElement>(null);
  const heldFile = useRef<File | null>(null);

  const [chosen, setChosen] = useState<{ name: string; size: number } | null>(
    null
  );
  const [payload, setPayload] = useState<ImportResult | null>(null);
  const [pending, setPending] = useState(false);
  const [windowMonths, setWindowMonths] = useState<WindowMonths>(12);
  const [showAll, setShowAll] = useState(false);
  const [applied, setApplied] = useState(false);
  const [showPaste, setShowPaste] = useState(false);

  const rawSummary = payload?.ok
    ? (payload.byWindow?.[windowMonths] ?? null)
    : null;
  const summary = useMemo(() => {
    if (!rawSummary) return null;
    return retotalSummary(rawSummary, state.categoryOverrides);
  }, [rawSummary, state.categoryOverrides]);

  function holdFile(file: File | null | undefined) {
    if (!file || file.size === 0) return;
    heldFile.current = file;
    setChosen({ name: file.name, size: file.size });
  }

  function onPick(list: FileList | null) {
    holdFile(list?.[0]);
  }

  async function readFile() {
    const live = fileRef.current?.files?.[0];
    holdFile(live);
    const file =
      live && live.size > 0 ? live : heldFile.current;
    const paste = pasteRef.current?.value ?? "";

    if ((!file || file.size === 0) && !paste.trim()) {
      setPayload({
        ok: false,
        error:
          "No file is chosen. Pick the .qif first — the name should stay visible — then click Read file.",
      });
      return;
    }

    setPending(true);
    setApplied(false);
    try {
      const result = await parseQuickenSources({
        files: file ? [file] : [],
        paste,
      });
      setPayload(result);
    } catch {
      setPayload({
        ok: false,
        error:
          "The file could not be read in this browser. Try exporting QIF again from Quicken, or paste a few transactions below.",
      });
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
  }

  const visibleCategories = summary
    ? summary.categories
        .filter((item) => item.kind !== "transfer")
        .slice(0, showAll ? undefined : 12)
    : [];

  const status = pending
    ? `Reading ${chosen?.name ?? "the file"} on this page…`
    : payload?.ok
      ? `Read ${payload.fileName}: ${payload.transactionCount} transactions. Totals are below.`
      : payload?.error
        ? payload.error
        : chosen
          ? `${chosen.name} is ready. Click Read file.`
          : "Choose the file, then click Read file. The filename should stay visible.";

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
          Choose your .qif. The filename stays here. Then press Read file — you
          should see monthly totals, not a blank picker and not the raw export.
        </p>

        <div className="flex flex-col gap-4 rounded-2xl border border-dashed border-border bg-muted/30 px-4 py-6">
          <label className="flex flex-col gap-2 text-sm font-medium">
            File
            <input
              ref={fileRef}
              type="file"
              name="quicken"
              accept=".qif,.csv,.txt,.tsv,.QIF,.CSV"
              className="block w-full cursor-pointer text-sm file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-primary file:px-3 file:py-2 file:text-sm file:font-medium file:text-primary-foreground"
              onChange={(event) => onPick(event.target.files)}
              onInput={(event) =>
                onPick((event.target as HTMLInputElement).files)
              }
            />
          </label>
          <p className="text-sm" data-testid="chosen-file">
            {chosen
              ? `Chosen: ${chosen.name} · ${formatBytes(chosen.size)}`
              : "No file chosen yet."}
          </p>
          <button
            type="button"
            disabled={pending}
            onClick={() => void readFile()}
            className="inline-flex h-10 w-fit items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/80 disabled:opacity-60"
          >
            {pending ? "Reading…" : "Read file"}
          </button>
          <p
            className={cn(
              "rounded-xl px-3 py-2 text-sm",
              payload?.ok === false
                ? "border border-destructive/30 bg-destructive/5 text-destructive"
                : "border border-steward/20 bg-steward/5"
            )}
            role="status"
          >
            {status}
          </p>
          <button
            type="button"
            className="self-start text-sm text-muted-foreground underline-offset-4 hover:underline"
            onClick={() => setShowPaste((value) => !value)}
          >
            {showPaste ? "Hide paste box" : "Paste QIF text instead"}
          </button>
          {showPaste ? (
            <label className="flex flex-col gap-2 text-sm font-medium">
              Paste
              <textarea
                ref={pasteRef}
                rows={5}
                className="w-full rounded-lg border border-input bg-background px-2.5 py-2 font-mono text-xs"
                placeholder={"!Type:Bank\nD3/15'26\nT-52.10\nPStore\nLGroceries\n^"}
              />
            </label>
          ) : null}
        </div>

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
              <Metric
                label="Monthly income"
                value={formatMoney(summary.monthlyIncome)}
              />
              <Metric
                label="Monthly living"
                value={formatMoney(summary.monthlyExpenses)}
              />
              <Metric
                label="Monthly giving"
                value={formatMoney(summary.monthlyGiving)}
              />
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

function formatBytes(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
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
