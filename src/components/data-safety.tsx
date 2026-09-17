"use client";

import { useRef, useState } from "react";

import { useAppState, type StorageMode } from "@/hooks/use-app-state";

const storageCopy: Record<StorageMode, { label: string; detail: string }> = {
  cloud: { label: "Synced to your account", detail: "Your data is stored privately in Supabase and follows your sign-in." },
  local: {
    label: "Saved on this device",
    detail: "Your data should still be here after you close the browser.",
  },
  session: {
    label: "Saved for this session only",
    detail: "Export a backup before closing this browser session.",
  },
  memory: {
    label: "Not saved permanently",
    detail: "Browser storage is unavailable. Export a backup before leaving.",
  },
};

export function DataSafety() {
  const { storageMode, cloudEmail, cloudStatus, signIn, signOut, exportBackup, importBackup, reset } = useAppState();
  const inputRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const storage = storageCopy[storageMode];

  const downloadBackup = () => {
    const blob = new Blob([exportBackup()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    const date = new Date().toISOString().slice(0, 10);
    anchor.href = url;
    anchor.download = `two-goals-backup-${date}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    setMessage("Backup downloaded.");
  };

  const restoreBackup = async (file: File | undefined) => {
    if (!file) return;
    try {
      const raw = await file.text();
      importBackup(raw);
      setMessage("Backup restored successfully.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Could not restore this backup."
      );
    } finally {
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const resetAllData = () => {
    const confirmed = window.confirm(
      "Erase all Two Goals data on this device? This includes prayers, practices, financial entries, ledger history, and Counsel answers. Export a backup first if you may want it later."
    );
    if (!confirmed) return;

    const confirmedAgain = window.confirm(
      "This cannot be undone unless you have a backup. Erase everything now?"
    );
    if (!confirmedAgain) return;

    reset();
    setMessage("All local Two Goals data was erased.");
  };

  const requestSignIn = async () => {
    if (!email.trim()) return;
    setSending(true);
    try { await signIn(email.trim()); setMessage("Check your email for the secure Two Goals sign-in link."); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Could not send the sign-in link."); }
    finally { setSending(false); }
  };

  return (
    <section
      aria-labelledby="data-safety-heading"
      className="rounded-2xl border border-border/80 bg-card/70 p-4"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h2 id="data-safety-heading" className="font-heading text-base text-foreground">
            Your data
          </h2>
          <p className="text-sm font-medium text-foreground/90">{storage.label}</p>
          <p className="text-xs text-muted-foreground">{storage.detail}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {cloudEmail ? <><span className="text-xs text-muted-foreground">{cloudEmail}</span><button type="button" onClick={() => void signOut()} className="rounded-full border border-border px-3 py-1.5 text-sm">Sign out</button></> : <><input value={email} onChange={(event) => setEmail(event.target.value)} type="email" placeholder="Email for cloud sync" aria-label="Email for cloud sync" className="h-9 rounded-full border border-border bg-background px-3 text-sm" /><button type="button" onClick={() => void requestSignIn()} disabled={sending} className="rounded-full bg-foreground px-3 py-1.5 text-sm text-background disabled:opacity-50">{sending ? "Sending…" : "Sign in to sync"}</button></>}
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={downloadBackup}
            className="rounded-full border border-border bg-background px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            Export backup
          </button>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="rounded-full border border-border bg-background px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            Restore backup
          </button>
          <button
            type="button"
            onClick={resetAllData}
            className="rounded-full border border-border bg-background px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Reset data
          </button>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="application/json,.json"
        className="sr-only"
        onChange={(event) => void restoreBackup(event.target.files?.[0])}
      />
      {message ? (
        <p role="status" className="mt-3 text-xs text-muted-foreground">
          {message}
        </p>
      ) : null}
    </section>
  );
}
