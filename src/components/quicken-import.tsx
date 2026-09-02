"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

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
  const seenToken = useRef("");
  const loadRef = useRef<(blob: Blob, name: string) => Promise<void>>(
    async () => undefined
  );

  const [payload, setPayload] = useState<ImportResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState(
    "Choose a QIF, then click Read file. Or drop it, or try the sample."
  );
  const [windowMonths, setWindowMonths] = useState<WindowMonths>(12);
  const [showAll, setShowAll] = useState(false);
  const [applied, setApplied] = useState(false);
  const [showPaste, setShowPaste] = useState(false);
  const [dragging, setDragging] = useState(false);
  const router = useRouter();

  const rawSummary = payload?.ok
    ? (payload.byWindow?.[windowMonths] ?? null)
    : null;
  const summary = useMemo(() => {
    if (!rawSummary) return null;
    return retotalSummary(rawSummary, state.categoryOverrides);
  }, [rawSummary, state.categoryOverrides]);

  async function loadBlob(blob: Blob, name: string) {
    setBusy(true);
    setApplied(false);
    setNote(`Reading ${name}…`);
    try {
      const buffer = await readAsArrayBuffer(blob);
      const result = await parseQuickenBytes(name, buffer);
      setPayload(result);
      setNote(
        result.ok
          ? `Loaded ${name}: ${result.transactionCount} transactions.`
          : (result.error ?? "That file did not contain transactions.")
      );
    } catch (cause) {
      const message =
        cause instanceof Error ? cause.message : "The file could not be read.";
      setPayload({ ok: false, error: message });
      setNote(message);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    loadRef.current = loadBlob;
  });

  useEffect(() => {
    const timer = window.setInterval(() => {
      const file = fileRef.current?.files?.[0];
      if (!file || file.size === 0) return;
      const token = `${file.name}:${file.size}:${file.lastModified}`;
      if (token === seenToken.current) return;
      seenToken.current = token;
      void loadRef.current(file, file.name);
    }, 300);
    return () => window.clearInterval(timer);
  }, []);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    const submitter = (event.nativeEvent as SubmitEvent).submitter;
    const wantsSample =
      submitter instanceof HTMLButtonElement && submitter.name === "sample";
    const formData = new FormData(event.currentTarget);
    const uploaded = formData.get("quicken");
    const file =
      uploaded instanceof File && uploaded.size > 0
        ? uploaded
        : fileRef.current?.files?.[0];
    const paste = String(formData.get("paste") ?? "").trim();

    if (wantsSample) {
      event.preventDefault();
      void loadSample();
      return;
    }
    if (file && file.size > 0) {
      event.preventDefault();
      seenToken.current = `${file.name}:${file.size}:${file.lastModified}`;
      void loadBlob(file, file.name);
      return;
    }
    if (paste) {
      event.preventDefault();
      const result = parseQuickenText("pasted.qif", paste);
      setPayload(result);
      setNote(
        result.ok
          ? `Loaded pasted text: ${result.transactionCount} transactions.`
          : (result.error ?? "Paste did not contain transactions.")
      );
      return;
    }
    setNote("Sending the file to Steward…");
  }

  async function loadSample() {
    setBusy(true);
    setApplied(false);
    setNote("Reading sample.qif…");
    try {
      const response = await fetch("/samples/sample.qif");
      if (!response.ok) throw new Error("Sample file was missing.");
      const buffer = await response.arrayBuffer();
      const result = await parseQuickenBytes("sample.qif", buffer);
      setPayload(result);
      setNote(
        result.ok
          ? `Loaded sample.qif: ${result.transactionCount} transactions.`
          : (result.error ?? "Sample failed.")
      );
    } catch {
      router.push("/steward/import?sample=1");
    } finally {
      setBusy(false);
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
          After the filename appears, click <strong>Read file</strong>. If the
          page still sits still, drop the file on the box or try the sample.
        </p>

        <form
          className={cn(
            "flex flex-col gap-4 rounded-2xl border border-dashed bg-muted/30 px-4 py-6",
            dragging ? "border-steward bg-steward/10" : "border-border"
          )}
          action="/steward/import"
          method="post"
          encType="multipart/form-data"
          onSubmit={onSubmit}
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
            if (file) {
              seenToken.current = `${file.name}:${file.size}:${file.lastModified}`;
              void loadBlob(file, file.name);
            }
          }}
        >
          <label className="flex flex-col gap-2 text-sm font-medium">
            File
            <input
              ref={fileRef}
              type="file"
              name="quicken"
              accept=".qif,.csv,.txt,.tsv,.QIF,.CSV"
              className="block w-full cursor-pointer text-sm file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-primary file:px-3 file:py-2 file:text-sm file:font-medium file:text-primary-foreground"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                seenToken.current = `${file.name}:${file.size}:${file.lastModified}`;
                void loadBlob(file, file.name);
              }}
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={busy}
              className="inline-flex h-10 w-fit items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/80 disabled:opacity-60"
            >
              {busy ? "Reading…" : "Read file"}
            </button>
            <button
              type="submit"
              name="sample"
              value="1"
              disabled={busy}
              className="inline-flex h-10 w-fit items-center justify-center rounded-lg border border-border bg-background px-4 text-sm font-medium hover:bg-muted disabled:opacity-60"
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
            {note}
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
                name="paste"
                rows={5}
                className="w-full rounded-lg border border-input bg-background px-2.5 py-2 font-mono text-xs"
                placeholder={"!Type:Bank\nD3/15'26\nT-52.10\nPStore\nLGroceries\n^"}
              />
            </label>
          ) : null}
        </form>

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
