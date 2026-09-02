"use client";

import { displayKind } from "@/lib/quicken";
import { formatMoney } from "@/lib/finance";
import type { LedgerKind } from "@/lib/types";

export type KindRow = {
  name: string;
  kind: LedgerKind;
  total: number;
};

export function CategoryKindList({
  categories,
  onCycle,
}: {
  categories: KindRow[];
  onCycle: (name: string, kind: LedgerKind) => void;
}) {
  if (categories.length === 0) return null;
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium">
        Click a whole row to change its type (Income, Living, Giving, Transfer,
        Ignored).
      </p>
      <ul className="flex flex-col gap-2">
        {categories.map((item) => (
          <li key={item.name}>
            <button
              type="button"
              onClick={() => onCycle(item.name, item.kind)}
              className="flex min-h-12 w-full cursor-pointer items-center justify-between gap-3 rounded-xl border border-border bg-background px-3 py-2 text-left text-sm hover:border-steward hover:bg-steward/5"
            >
              <span className="min-w-0 flex-1 font-medium break-words">
                {item.name || "(uncategorized)"}
              </span>
              <span className="shrink-0 tabular-nums text-muted-foreground">
                {formatMoney(Math.abs(item.total))}
              </span>
              <span className="w-20 shrink-0 rounded-full border border-steward/40 bg-steward/10 px-2 py-1 text-center text-xs font-medium text-steward">
                {displayKind(item.kind)}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
