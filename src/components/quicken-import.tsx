"use client";

import { useRef, useState } from "react";
import { Bot, ChevronDown, ShieldCheck } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAppState } from "@/hooks/use-app-state";
import { formatMoney } from "@/lib/finance";
import { previewQuickenImport, type QuickenImportPreview } from "@/lib/quicken";

type MetricKey = "netWorth" | "cash" | "debt" | "monthlyIncome" | "monthlyExpenses" | "monthlyGiving";
type Draft = Record<MetricKey, string>;
type Selection = Record<MetricKey, boolean>;

const labels: Record<MetricKey, { title: string; detail: string }> = {
  netWorth: { title: "Invested assets", detail: "Recognized investment-account balances." },
  cash: { title: "Cash", detail: "Recognized checking, savings, cash, and money-market balances." },
  debt: { title: "Debt", detail: "Recognized credit cards, loans, mortgages, and liabilities." },
  monthlyIncome: { title: "Average monthly income", detail: "Average positive non-transfer transactions from the months shown below." },
  monthlyExpenses: { title: "Average monthly living", detail: "Average negative transactions excluding giving and transfers." },
  monthlyGiving: { title: "Average monthly giving", detail: "Average spending in categories recognized as giving." },
};

const metricOrder: MetricKey[] = ["netWorth", "cash", "debt", "monthlyIncome", "monthlyExpenses", "monthlyGiving"];

function previewValue(preview: QuickenImportPreview, key: MetricKey): number | null {
  return key === "netWorth" ? preview.investedAssets : preview[key];
}

function asDraft(preview: QuickenImportPreview): Draft {
  return Object.fromEntries(metricOrder.map((key) => {
    const value = previewValue(preview, key);
    return [key, value == null ? "" : String(Math.round(value * 100) / 100)];
  })) as Draft;
}

function asSelection(preview: QuickenImportPreview): Selection {
  return Object.fromEntries(metricOrder.map((key) => [key, previewValue(preview, key) != null])) as Selection;
}

function parseDraft(raw: string): number {
  const value = Number(raw.replace(/[$,]/g, "").trim());
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

function percent(value: number) {
  return `${Math.round(value * 100)}%`;
}

export function QuickenImport() {
  const { state, setState } = useAppState();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<QuickenImportPreview | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [selected, setSelected] = useState<Selection | null>(null);
  const [fileName, setFileName] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [showAudit, setShowAudit] = useState(false);
  const [includeTransactionDetails, setIncludeTransactionDetails] = useState(false);
  const [guideAnswer, setGuideAnswer] = useState("");
  const [guideError, setGuideError] = useState("");
  const [guideLoading, setGuideLoading] = useState(false);

  async function readFile(file: File | undefined) {
    if (!file) return;
    try {
      const text = await file.text();
      const next = previewQuickenImport(file.name, text);
      setPreview(next);
      setDraft(asDraft(next));
      setSelected(asSelection(next));
      setFileName(file.name);
      setMessage(null);
      setShowAudit(false);
      setGuideAnswer("");
      setGuideError("");
    } catch (error) {
      setPreview(null);
      setDraft(null);
      setSelected(null);
      setFileName(file.name);
      setMessage(error instanceof Error ? error.message : "Could not read this Quicken export.");
    } finally {
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function applyImport() {
    if (!preview || !draft || !selected) return;
    const values = Object.fromEntries(metricOrder.map((key) => [key, parseDraft(draft[key])])) as Record<MetricKey, number>;
    setState((previous) => {
      const finance = { ...previous.finance };
      if (selected.netWorth) finance.netWorth = values.netWorth;
      if (selected.cash) finance.cash = values.cash;
      if (selected.debt) finance.debt = values.debt;
      if (selected.monthlyExpenses) finance.monthlyExpenses = values.monthlyExpenses;
      if (selected.monthlyGiving) finance.monthlyGiving = values.monthlyGiving;
      if (selected.monthlyIncome) {
        finance.monthlyIncome = values.monthlyIncome;
        finance.incomeSources = [{ id: "quicken-import", name: "Quicken average", monthly: values.monthlyIncome }];
      }
      return { ...previous, finance };
    });
    const changed = metricOrder.filter((key) => selected[key]).length;
    setMessage(`Imported ${changed} reviewed ${changed === 1 ? "value" : "values"} from ${fileName}.`);
    setPreview(null);
    setDraft(null);
    setSelected(null);
  }

  async function askGuideToAudit() {
    if (!preview || guideLoading) return;
    setGuideLoading(true);
    setGuideAnswer("");
    setGuideError("");
    const auditContext = {
      source: "Quicken import audit",
      fileKind: preview.kind,
      summary: {
        transactions: preview.transactions,
        accounts: preview.accounts,
        monthsUsed: preview.monthsUsed,
        importedValues: Object.fromEntries(metricOrder.map((key) => [key, previewValue(preview, key)])),
        coverage: preview.coverage,
        warnings: preview.warnings,
      },
      accounts: preview.accountAudit,
      monthlyTotals: preview.monthlyAudit,
      transactionDetails: includeTransactionDetails ? preview.transactionAudit.slice(0, 75) : "Not shared",
    };
    try {
      const response = await fetch("/api/guide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: "Audit this Quicken import for likely misclassification or distorted averages. Tell me what I should verify before applying it.",
          context: auditContext,
        }),
      });
      const data = (await response.json()) as { answer?: string; error?: string };
      if (!response.ok) throw new Error(data.error || "Guide could not review this import.");
      setGuideAnswer(data.answer || "");
    } catch (error) {
      setGuideError(error instanceof Error ? error.message : "Guide could not review this import.");
    } finally {
      setGuideLoading(false);
    }
  }

  return (
    <Card className="bg-card/80">
      <CardHeader className="border-b">
        <CardDescription>Quicken Classic for Windows</CardDescription>
        <CardTitle className="font-heading text-2xl">Import from Quicken</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-5 pt-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-2xl">
            <p className="text-sm leading-relaxed text-muted-foreground">
              Export QIF or CSV, inspect exactly how Two Goals classified it, then approve only the values you trust. The raw file stays in this browser.
            </p>
          </div>
          <button type="button" onClick={() => inputRef.current?.click()} className="inline-flex h-10 shrink-0 items-center justify-center rounded-lg bg-steward px-4 text-sm font-medium text-white hover:bg-steward/90">
            Choose Quicken export
          </button>
          <input ref={inputRef} type="file" accept=".qif,.csv,.txt,.qxf,text/csv,text/plain" className="sr-only" onChange={(event) => void readFile(event.target.files?.[0])} />
        </div>

        {preview && draft && selected ? (
          <div className="flex flex-col gap-5 rounded-2xl border border-border/80 bg-background/60 p-4 sm:p-5">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
              <div>
                <p className="text-sm font-medium">Review {fileName}</p>
                <p className="text-xs text-muted-foreground">
                  {preview.kind.toUpperCase()} · {preview.transactions} transactions · {preview.accounts} accounts
                  {preview.monthsUsed.length ? ` · averages from ${preview.monthsUsed.join(", ")}` : ""}
                </p>
              </div>
              <p className="text-xs text-muted-foreground">Nothing changes until you press Update Two Goals.</p>
            </div>

            <section className="grid gap-3 sm:grid-cols-4">
              <AuditStat label="Transaction coverage" value={percent(preview.coverage.transactionCoverage)} detail={`${preview.coverage.reviewTransactions} need closer review`} />
              <AuditStat label="Account coverage" value={percent(preview.coverage.accountCoverage)} detail={`${preview.coverage.reviewAccounts} unrecognized`} />
              <AuditStat label="Months averaged" value={String(preview.monthsUsed.length)} detail={preview.monthsUsed.join(", ") || "none"} />
              <AuditStat label="Transfers excluded" value={String(preview.transactionAudit.filter((item) => item.classification === "transfer").length)} detail="not treated as income/spending" />
            </section>

            <div className="grid gap-3">
              {metricOrder.map((key) => {
                const available = previewValue(preview, key) != null;
                const current = key === "monthlyIncome" ? state.finance.monthlyIncome : key === "netWorth" ? state.finance.netWorth : state.finance[key];
                return (
                  <label key={key} className={`grid gap-3 rounded-xl border p-3 sm:grid-cols-[auto_1fr_10rem] sm:items-center ${available ? "border-border" : "border-border/50 opacity-60"}`}>
                    <input type="checkbox" checked={selected[key]} disabled={!available} onChange={(event) => setSelected((previous) => previous ? { ...previous, [key]: event.target.checked } : previous)} className="size-4" />
                    <span>
                      <span className="block text-sm font-medium">{labels[key].title}</span>
                      <span className="block text-xs leading-relaxed text-muted-foreground">{labels[key].detail} Current: {formatMoney(current)}.</span>
                    </span>
                    <div className="relative">
                      <span className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                      <Input inputMode="decimal" className="pl-6" value={draft[key]} disabled={!available} onChange={(event) => setDraft((previous) => previous ? { ...previous, [key]: event.target.value } : previous)} aria-label={`${labels[key].title} imported value`} />
                    </div>
                  </label>
                );
              })}
            </div>

            <button type="button" onClick={() => setShowAudit((value) => !value)} className="flex w-full items-center justify-between rounded-xl border border-border bg-card px-4 py-3 text-left text-sm font-medium hover:bg-muted/50">
              <span>{showAudit ? "Hide" : "Review"} import details</span>
              <ChevronDown className={`size-4 transition-transform ${showAudit ? "rotate-180" : ""}`} />
            </button>

            {showAudit ? <AuditDetails preview={preview} /> : null}

            <section className="rounded-2xl border border-faith/25 bg-faith/5 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="flex items-center gap-2 text-xs tracking-[0.16em] text-faith uppercase"><Bot className="size-4" /> AI audit</p>
                  <p className="mt-1 text-sm font-medium">Ask Guide to challenge the import before you trust it.</p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Account classifications, monthly totals, coverage, and warnings can be sent. Raw file contents are never uploaded.</p>
                </div>
                <button type="button" onClick={() => void askGuideToAudit()} disabled={guideLoading} className="inline-flex h-10 shrink-0 items-center justify-center rounded-lg bg-faith px-4 text-sm font-medium text-white disabled:opacity-50">
                  {guideLoading ? "Reviewing…" : "Ask Guide to audit"}
                </button>
              </div>
              <label className="mt-3 flex items-start gap-2 text-xs text-muted-foreground">
                <input type="checkbox" checked={includeTransactionDetails} onChange={(event) => setIncludeTransactionDetails(event.target.checked)} className="mt-0.5 size-4" />
                Include up to 75 transaction rows in this AI review. Off by default. Payee/category details may be sensitive.
              </label>
              {guideError ? <p role="alert" className="mt-3 rounded-lg border border-destructive/25 bg-destructive/5 p-3 text-sm text-destructive">{guideError}</p> : null}
              {guideAnswer ? <div className="mt-3 whitespace-pre-wrap rounded-xl border border-border bg-background p-4 text-sm leading-7">{guideAnswer}</div> : null}
            </section>

            {preview.warnings.length ? (
              <div className="rounded-xl border border-border/80 bg-muted/40 p-3 text-xs leading-relaxed text-muted-foreground">
                {preview.warnings.map((warning) => <p key={warning}>{warning}</p>)}
              </div>
            ) : null}

            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={applyImport} disabled={!metricOrder.some((key) => selected[key])} className="inline-flex h-10 items-center justify-center rounded-lg bg-steward px-4 text-sm font-medium text-white hover:bg-steward/90 disabled:cursor-not-allowed disabled:opacity-50">Update Two Goals</button>
              <button type="button" onClick={() => { setPreview(null); setDraft(null); setSelected(null); setMessage(null); }} className="inline-flex h-10 items-center justify-center rounded-lg border border-border bg-background px-4 text-sm font-medium hover:bg-muted">Cancel</button>
            </div>
          </div>
        ) : null}

        {message ? <p role="status" className="rounded-xl border border-border/80 bg-muted/40 px-4 py-3 text-sm">{message}</p> : null}
        <p className="flex items-center gap-2 text-xs text-muted-foreground"><ShieldCheck className="size-4 text-steward" /> Quicken parsing and detailed audit happen locally in your browser.</p>
      </CardContent>
    </Card>
  );
}

function AuditStat({ label, value, detail }: { label: string; value: string; detail: string }) {
  return <div className="rounded-xl border border-border/80 bg-card p-3"><p className="text-[11px] tracking-wide text-muted-foreground uppercase">{label}</p><p className="font-heading mt-1 text-2xl">{value}</p><p className="mt-1 text-[11px] text-muted-foreground">{detail}</p></div>;
}

function AuditDetails({ preview }: { preview: QuickenImportPreview }) {
  return (
    <div className="flex flex-col gap-5">
      <section>
        <h3 className="text-sm font-semibold">Accounts</h3>
        <div className="mt-2 overflow-x-auto rounded-xl border border-border/80">
          <table className="w-full min-w-[42rem] text-xs">
            <thead className="bg-muted/50 text-left text-muted-foreground"><tr><th className="p-3">Account</th><th className="p-3">Type</th><th className="p-3">Balance</th><th className="p-3">Classified as</th><th className="p-3">Confidence</th><th className="p-3">Why</th></tr></thead>
            <tbody>{preview.accountAudit.map((item, index) => <tr key={`${item.name}-${index}`} className="border-t border-border/60"><td className="p-3 font-medium">{item.name}</td><td className="p-3">{item.type || "—"}</td><td className="p-3 tabular-nums">{item.balance == null ? "—" : formatMoney(item.balance)}</td><td className="p-3">{item.classification}</td><td className="p-3">{item.confidence}</td><td className="p-3 text-muted-foreground">{item.reason}</td></tr>)}</tbody>
          </table>
        </div>
      </section>

      <section>
        <h3 className="text-sm font-semibold">Monthly calculation</h3>
        <div className="mt-2 overflow-x-auto rounded-xl border border-border/80">
          <table className="w-full min-w-[34rem] text-xs">
            <thead className="bg-muted/50 text-left text-muted-foreground"><tr><th className="p-3">Month</th><th className="p-3">Income</th><th className="p-3">Living</th><th className="p-3">Giving</th><th className="p-3">Transfers excluded</th><th className="p-3">Rows used</th></tr></thead>
            <tbody>{preview.monthlyAudit.map((row) => <tr key={row.month} className="border-t border-border/60"><td className="p-3 font-medium">{row.month}</td><td className="p-3 tabular-nums">{formatMoney(row.income)}</td><td className="p-3 tabular-nums">{formatMoney(row.living)}</td><td className="p-3 tabular-nums">{formatMoney(row.giving)}</td><td className="p-3 tabular-nums">{formatMoney(row.transfers)}</td><td className="p-3">{row.includedTransactions}</td></tr>)}</tbody>
          </table>
        </div>
      </section>

      <section>
        <div className="flex items-baseline justify-between gap-3"><h3 className="text-sm font-semibold">Transactions</h3><p className="text-xs text-muted-foreground">Showing up to 200 rows</p></div>
        <div className="mt-2 max-h-[32rem] overflow-auto rounded-xl border border-border/80">
          <table className="w-full min-w-[58rem] text-xs">
            <thead className="sticky top-0 bg-muted text-left text-muted-foreground"><tr><th className="p-3">Date</th><th className="p-3">Payee</th><th className="p-3">Category</th><th className="p-3">Amount</th><th className="p-3">Class</th><th className="p-3">Used?</th><th className="p-3">Confidence</th></tr></thead>
            <tbody>{preview.transactionAudit.slice(0, 200).map((item, index) => <tr key={`${item.date}-${item.payee}-${index}`} className={`border-t border-border/60 ${item.confidence === "low" ? "bg-faith/5" : ""}`}><td className="p-3">{item.date || "Invalid"}</td><td className="p-3 font-medium">{item.payee || "—"}</td><td className="p-3">{item.category || "—"}</td><td className="p-3 tabular-nums">{formatMoney(item.amount)}</td><td className="p-3">{item.classification}</td><td className="p-3">{item.includedInAverage ? "Yes" : "No"}</td><td className="p-3">{item.confidence}</td></tr>)}</tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
