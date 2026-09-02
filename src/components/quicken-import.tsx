"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";

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
  parseQuickenBytes,
  parseQuickenText,
  type ImportResult,
} from "@/lib/quicken/from-form";
import { readAsArrayBuffer } from "@/lib/quicken/parse";
import type { WindowMonths } from "@/lib/quicken";
import type { AppState, LedgerKind } from "@/lib/types";
import { cn } from "@/lib/utils";

type LoadedFile = { name: string; size: number; buffer: ArrayBuffer };

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
  const loadedRef = useRef<LoadedFile | null>(null);
  const runId = useRef(0);

  const [chosen, setChosen] = useState<string>("No file loaded yet.");
  const [payload, setPayload] = useState<ImportResult | null>(null);
  const [pending, setPending] = useState(false);
  const [windowMonths, setWindowMonths] = useState<WindowMonths>(12);
  const [showAll, setShowAll] = useState(false);
  const [applied, setApplied] = useState(false);
  const [showPaste, setShowPaste] = useState(false);
  const [dragging, setDragging] = useState(false);

  const rawSummary = payload?.ok
    ? (payload.byWindow?.[windowMonths] ?? null)
    : null;
  const summary = useMemo(() => {
    if (!rawSummary) return null;
    return retotalSummary(rawSummary, state.categoryOverrides);
  }, [rawSummary, state.categoryOverrides]);

  const ingestBlob = useCallback(async (blob: Blob, name: string, reason: string) => {
    const id = ++runId.current;
    flushSync(() => {
      setPending(true);
      setApplied(false);
      setChosen(`Loading ${name}…`);
    });
    await yieldToPaint();
    try {
      const buffer = await readAsArrayBuffer(blob);
      if (id !== runId.current) return;
      loadedRef.current = { name, size: buffer.byteLength, buffer };
      setChosen(`Loaded ${name} · ${formatBytes(buffer.byteLength)}`);
      await yieldToPaint();
      if (id !== runId.current) return;
      const result = await parseQuickenBytes(name, buffer);
      if (id !== runId.current) return;
      setPayload(result);
    } catch (cause) {
      if (id !== runId.current) return;
      const message =
        cause instanceof Error ? cause.message : "The file could not be read.";
      setPayload({
        ok: false,
        error: `${reason} ran, then failed: ${message}`,
      });
    } finally {
      if (id === runId.current) setPending(false);
    }
  }, []);

  useEffect(() => {
    const input = fileRef.current;
    if (!input) return;
    const onChange = () => {
      const file = input.files?.[0];
      if (file) void ingestBlob(file, file.name, "Chosen");
    };
    input.addEventListener("change", onChange);
    input.addEventListener("input", onChange);
    return () => {
      input.removeEventListener("change", onChange);
      input.removeEventListener("input", onChange);
    };
  }, [ingestBlob]);

  async function readFile() {
    const id = ++runId.current;
    flushSync(() => {
      setPending(true);
      setApplied(false);
    });
    await yieldToPaint();
    try {
      const live = fileRef.current?.files?.[0];
      if (live) {
        const buffer = await readAsArrayBuffer(live);
        if (id !== runId.current) return;
        loadedRef.current = {
          name: live.name,
          size: buffer.byteLength,
          buffer,
        };
        setChosen(`Loaded ${live.name} · ${formatBytes(buffer.byteLength)}`);
      }

      const loaded = loadedRef.current;
      const paste = pasteRef.current?.value?.trim() ?? "";
      if (!loaded && !paste) {
        setPayload({
          ok: false,
          error:
            "Read file ran, but the QIF was not in memory yet. Choose the file again, wait until it says Loaded, then click Read file.",
        });
        return;
      }

      await yieldToPaint();
      const result = paste
        ? parseQuickenText("pasted.qif", paste)
        : await parseQuickenBytes(loaded!.name, loaded!.buffer);
      if (id !== runId.current) return;
      setPayload(result);
    } catch (cause) {
      if (id !== runId.current) return;
      const message =
        cause instanceof Error ? cause.message : "The file could not be read.";
      setPayload({ ok: false, error: `Read file ran, then failed: ${message}` });
    } finally {
      if (id === runId.current) setPending(false);
    }
  }

  async function loadSample() {
    flushSync(() => {
      setPending(true);
      setChosen("Loading sample QIF…");
    });
    await yieldToPaint();
    try {
      const response = await fetch("/samples/sample.qif");
      if (!response.ok) throw new Error("Sample file was missing.");
      const buffer = await response.arrayBuffer();
      loadedRef.current = {
        name: "sample.qif",
        size: buffer.byteLength,
        buffer,
      };
      setChosen(`Loaded sample.qif · ${formatBytes(buffer.byteLength)}`);
      setPayload(await parseQuickenBytes("sample.qif", buffer));
    } catch (cause) {
      const message =
        cause instanceof Error ? cause.message : "Sample failed.";
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
  }

  const visibleCategories = summary
    ? summary.categories
        .filter((item) => item.kind !== "transfer")
        .slice(0, showAll ? undefined : 12)
    : [];

  const status = pending
    ? "Reading the file now. Totals should appear below this box."
    : payload?.ok
      ? `Read ${payload.fileName}: ${payload.transactionCount} transactions. Totals are below.`
      : payload?.error
        ? payload.error
        : "Choose a .qif (or drop it here). It should load on its own; Read file is a retry.";

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
          Choose the .qif. Steward loads it immediately and should show monthly
          totals without a second click. If it does not, press Read file — that
          button must report a result, even when parsing fails.
        </p>

        <div
          className={cn(
            "flex flex-col gap-4 rounded-2xl border border-dashed bg-muted/30 px-4 py-6",
            dragging ? "border-steward bg-steward/10" : "border-border"
          )}
          onDragEnter={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            const file = event.dataTransfer.files?.[0];
            if (file) void ingestBlob(file, file.name, "Drop");
          }}
        >
          <label className="flex flex-col gap-2 text-sm font-medium">
            File
            <input
              id="quicken-file-input"
              ref={fileRef}
              type="file"
              name="quicken"
              accept=".qif,.csv,.txt,.tsv,.QIF,.CSV"
              className="block w-full cursor-pointer text-sm file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-primary file:px-3 file:py-2 file:text-sm file:font-medium file:text-primary-foreground"
            />
          </label>
          <p className="text-sm font-medium" data-testid="chosen-file">
            {chosen}
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              aria-busy={pending}
              onClick={() => void readFile()}
              className="inline-flex h-10 w-fit items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/80"
            >
              {pending ? "Reading…" : "Read file"}
            </button>
            <button
              type="button"
              onClick={() => void loadSample()}
              className="inline-flex h-10 w-fit items-center justify-center rounded-lg border border-border bg-background px-4 text-sm font-medium hover:bg-muted"
            >
              Try a sample
            </button>
          </div>
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
              <button
                type="button"
                onClick={() => void readFile()}
                className="inline-flex h-9 w-fit items-center justify-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground"
              >
                Read pasted text
              </button>
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

function yieldToPaint() {
  return new Promise<void>((resolve) => {
    requestAnimationFrame(() => {
      setTimeout(resolve, 40);
    });
  });
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
