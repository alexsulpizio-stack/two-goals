import { cookies } from "next/headers";
import Link from "next/link";

import { ImportResultView } from "@/components/import-result-view";
import type { CompactImport } from "@/lib/quicken/from-form";

export default async function StewardReadPage() {
  const raw = (await cookies()).get("two-goals-import")?.value;
  let data: CompactImport | null = null;
  if (raw) {
    try {
      data = JSON.parse(raw) as CompactImport;
    } catch {
      data = null;
    }
  }

  if (!data) {
    return (
      <div className="mx-auto flex max-w-xl flex-col gap-4">
        <h1 className="font-heading text-4xl">No import yet</h1>
        <p className="text-muted-foreground">
          Choose a QIF on Steward and click Read file. You should land here with
          monthly totals — not a blank picker.
        </p>
        <Link href="/steward" className="text-steward underline-offset-4 hover:underline">
          Back to Steward
        </Link>
      </div>
    );
  }

  return <ImportResultView data={data} />;
}
