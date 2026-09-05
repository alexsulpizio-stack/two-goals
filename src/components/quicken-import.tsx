"use client";

import { useRef, useState } from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAppState } from "@/hooks/use-app-state";
import { formatMoney } from "@/lib/finance";
import { previewQuickenImport, type QuickenImportPreview } from "@/lib/quicken";

type MetricKey =
  | "netWorth"
  | "cash"
  | "debt"
  | "monthlyIncome"
  | "monthlyExpenses"
  | "monthlyGiving";

type Draft = Record<MetricKey, string>;
type Selection = Record<MetricKey, boolean>;

const labels: Record<MetricKey, { title: string; detail: string }> = {
  netWorth: {
    title: "Invested assets",
    detail: "Updates Steward’s invested net worth.",
  },
  cash: {
    title: "Cash",
    detail: "Checking, savings, cash, and money-market balances detected in the export.",
  },
  debt: {
    title: "Debt",
    detail: "Credit cards, loans, mortgages, and other detected liabilities.",
  },
  monthlyIncome: {
    title: "Average monthly income",
    detail: "Replaces the Steward income-source list with one Quicken average.",
  },
  monthlyExpenses: {
    title: "Average monthly living",
    detail: "Spending average excluding detected giving and transfers.",
  },
  monthlyGiving: {
    title: "Average monthly giving",
    detail: "Categories containing giving, tithe, charity, donation, offering, or ministry.",
  },
};

const metricOrder: MetricKey[] = [
  "netWorth",
  "cash",
  "debt",
  "monthlyIncome",
  "monthlyExpenses",
  "monthlyGiving",
];

function previewValue(preview: QuickenImportPreview, key: MetricKey): number | null {
  if (key === "netWorth") return preview.investedAssets;
  return preview[key];
}

function asDraft(preview: QuickenImportPreview): Draft {
  return Object.fromEntries(
    metricOrder.map((key) => {
      const value = previewValue(preview, key);
      return [key, value == null ? "" : String(Math.round(value * 100) / 100)];
    })
  ) as Draft;
}

function asSelection(preview: QuickenImportPreview): Selection {
  return Object.fromEntries(
    metricOrder.map((key) => [key, previewValue(preview, key) != null])
  ) as Selection;
}

function parseDraft(raw: string): number {
  const value = Number(raw.replace(/[$,]/g, "").trim());
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

export function QuickenImport() {
  const { state, setState } = useAppState();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<QuickenImportPreview | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [selected, setSelected] = useState<Selection | null>(null);
  const [fileName, setFileName] = useState("");
  const [message, setMessage] = useState<string | null>(null);

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
    const values = Object.fromEntries(
      metricOrder.map((key) => [key, parseDraft(draft[key])])
    ) as Record<MetricKey, number>;

    setState((previous) => {
      const finance = { ...previous.finance };
      if (selected.netWorth) finance.netWorth = values.netWorth;
      if (selected.cash) finance.cash = values.cash;
      if (selected.debt) finance.debt = values.debt;
      if (selected.monthlyExpenses) finance.monthlyExpenses = values.monthlyExpenses;
      if (selected.monthlyGiving) finance.monthlyGiving = values.monthlyGiving;
      if (selected.monthlyIncome) {
        finance.monthlyIncome = values.monthlyIncome;
        finance.incomeSources = [
          {
            id: "quicken-import",
            name: "Quicken average",
            monthly: values.monthlyIncome,
          },
        ];
      }
      return { ...previous, finance };
    });

    const changed = metricOrder.filter((key) => selected[key]).length;
    setMessage(`Imported ${changed} reviewed ${changed === 1 ? "value" : "values"} from ${fileName}.`);
    setPreview(null);
    setDraft(null);
    setSelected(null);
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
              Export a QIF or CSV file from Quicken Classic, then review the numbers before anything changes. The file is parsed in your browser and is not uploaded by Two Goals.
            </p>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              QXF is not supported yet. QIF gives the richest transaction data; CSV also works when it contains recognizable Quicken columns.
            </p>
          </div>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="inline-flex h-10 shrink-0 items-center justify-center rounded-lg bg-steward px-4 text-sm font-medium text-white hover:bg-steward/90"
          >
            Choose Quicken export
          </button>
          <input
            ref={inputRef}
            type="file"
            accept=".qif,.csv,.txt,.qxf,text/csv,text/plain"
            className="sr-only"
            onChange={(event) => void readFile(event.target.files?.[0])}
          />
        </div>

        {preview && draft && selected ? (
          <div className="flex flex-col gap-5 rounded-2xl border border-border/80 bg-background/60 p-4 sm:p-5">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
              <div>
                <p className="text-sm font-medium">Review {fileName}</p>
                <p className="text-xs text-muted-foreground">
                  {preview.kind.toUpperCase()} · {preview.transactions} transactions · {preview.accounts} accounts
                  {preview.monthsUsed.length > 0 ? ` · averages from ${preview.monthsUsed.join(", ")}` : ""}
                </p>
              </div>
              <p className="text-xs text-muted-foreground">Uncheck anything you do not want to overwrite.</p>
            </div>

            <div className="grid gap-3">
              {metricOrder.map((key) => {
                const available = previewValue(preview, key) != null;
                const current =
                  key === "monthlyIncome"
                    ? state.finance.monthlyIncome
                    : key === "netWorth"
                      ? state.finance.netWorth
                      : state.finance[key];
                return (
                  <label
                    key={key}
                    className={`grid gap-3 rounded-xl border p-3 sm:grid-cols-[auto_1fr_10rem] sm:items-center ${available ? "border-border" : "border-border/50 opacity-60"}`}
                  >
                    <input
                      type="checkbox"
                      checked={selected[key]}
                      disabled={!available}
                      onChange={(event) =>
                        setSelected((previous) =>
                          previous ? { ...previous, [key]: event.target.checked } : previous
                        )
                      }
                      className="size-4"
                    />
                    <span>
                      <span className="block text-sm font-medium">{labels[key].title}</span>
                      <span className="block text-xs leading-relaxed text-muted-foreground">
                        {labels[key].detail} Current: {formatMoney(current)}.
                      </span>
                    </span>
                    <div className="relative">
                      <span className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                      <Input
                        inputMode="decimal"
                        className="pl-6"
                        value={draft[key]}
                        disabled={!available}
                        onChange={(event) =>
                          setDraft((previous) =>
                            previous ? { ...previous, [key]: event.target.value } : previous
                          )
                        }
                        aria-label={`${labels[key].title} imported value`}
                      />
                    </div>
                  </label>
                );
              })}
            </div>

            {preview.warnings.length > 0 ? (
              <div className="rounded-xl border border-border/80 bg-muted/40 p-3 text-xs leading-relaxed text-muted-foreground">
                {preview.warnings.map((warning) => (
                  <p key={warning}>{warning}</p>
                ))}
              </div>
            ) : null}

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={applyImport}
                disabled={!metricOrder.some((key) => selected[key])}
                className="inline-flex h-10 items-center justify-center rounded-lg bg-steward px-4 text-sm font-medium text-white hover:bg-steward/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Update Two Goals
              </button>
              <button
                type="button"
                onClick={() => {
                  setPreview(null);
                  setDraft(null);
                  setSelected(null);
                  setMessage(null);
                }}
                className="inline-flex h-10 items-center justify-center rounded-lg border border-border bg-background px-4 text-sm font-medium hover:bg-muted"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : null}

        {message ? (
          <p role="status" className="rounded-xl border border-border/80 bg-muted/40 px-4 py-3 text-sm">
            {message}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
