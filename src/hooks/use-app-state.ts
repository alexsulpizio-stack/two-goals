"use client";

import { useCallback, useSyncExternalStore } from "react";

import { asLedgerSnapshots } from "@/lib/ledger";
import {
  normalizeIncomeSources,
  totalMonthlyIncome,
} from "@/lib/income";
import { asNextStream } from "@/lib/income-plays";
import { asInterview } from "@/lib/interview";
import {
  defaultState,
  emptyPractice,
  type AppState,
  type PracticeKind,
  type SprintMonths,
} from "@/lib/types";
import { supabase } from "@/lib/supabase";

const STORAGE_KEY = "two-goals:v1";
const BACKUP_VERSION = 1;

export type StorageMode = "cloud" | "local" | "session" | "memory";

type BackupEnvelope = {
  app: "two-goals";
  version: number;
  exportedAt: string;
  state: AppState;
};

let current: AppState = defaultState;
let loaded = false;
let storageMode: StorageMode = "memory";
const listeners = new Set<() => void>();
let cloudUserId: string | null = null;
let cloudEmail: string | null = null;
let cloudStatus: "signed_out" | "loading" | "ready" | "error" = "signed_out";
let cloudInitialized = false;

function asSprintMonths(value: unknown): SprintMonths {
  return value === 6 ? 6 : 12;
}

function mergeState(parsed: Partial<AppState>): AppState {
  const incomeSources = normalizeIncomeSources(parsed.finance);
  const savedCategories = parsed.finance?.livingCategories;
  const hasLegacyCategories = savedCategories?.some((category) => ["housing", "food", "other"].includes(category.id));
  const livingCategories = savedCategories?.length && !hasLegacyCategories
    ? savedCategories
    : defaultState.finance.livingCategories.map((category) => ({
        ...category,
        monthly: category.id === "other_living" ? Math.max(0, parsed.finance?.monthlyExpenses ?? 0) : 0,
      }));
  return {
    practices: parsed.practices ?? defaultState.practices,
    prayers: parsed.prayers ?? defaultState.prayers,
    finance: {
      ...defaultState.finance,
      ...parsed.finance,
      targetMonths: asSprintMonths(parsed.finance?.targetMonths),
      incomeSources,
      monthlyIncome: totalMonthlyIncome(incomeSources),
      livingCategories,
      nextStream: asNextStream(parsed.finance?.nextStream),
    },
    snapshots: asLedgerSnapshots(parsed.snapshots),
    interview: asInterview(parsed.interview),
  };
}

function readStored(): { raw: string; mode: StorageMode } | null {
  try {
    const local = window.localStorage.getItem(STORAGE_KEY);
    if (local) return { raw: local, mode: "local" };
  } catch {
    /* blocked */
  }
  try {
    const session = window.sessionStorage.getItem(STORAGE_KEY);
    return session ? { raw: session, mode: "session" } : null;
  } catch {
    return null;
  }
}

function reload() {
  if (typeof window === "undefined") return;
  loaded = true;
  const stored = readStored();
  if (!stored) {
    current = defaultState;
    storageMode = "memory";
    return;
  }

  try {
    current = mergeState(JSON.parse(stored.raw) as Partial<AppState>);
    storageMode = stored.mode;
  } catch {
    current = defaultState;
    storageMode = "memory";
  }
}

function persist(next: AppState) {
  const encoded = JSON.stringify(next);
  try {
    window.localStorage.setItem(STORAGE_KEY, encoded);
    storageMode = "local";
  } catch {
    try {
      window.sessionStorage.setItem(STORAGE_KEY, encoded);
      storageMode = "session";
    } catch {
      storageMode = "memory";
      // Private mode or a sandboxed preview can block storage. Keep working in memory.
    }
  }
  if (cloudUserId) {
    void supabase.from("user_app_state").upsert({ user_id: cloudUserId, state: next, updated_at: new Date().toISOString() }).then(({ error }) => {
      if (error) cloudStatus = "error";
      else { cloudStatus = "ready"; storageMode = "cloud"; }
      listeners.forEach((listener) => listener());
    });
  }
}

async function loadCloud() {
  if (cloudInitialized) return;
  cloudInitialized = true;
  cloudStatus = "loading";
  const { data: { user } } = await supabase.auth.getUser();
  cloudUserId = user?.id ?? null;
  cloudEmail = user?.email ?? null;
  if (user) {
    const { data, error } = await supabase.from("user_app_state").select("state").eq("user_id", user.id).maybeSingle();
    if (error) cloudStatus = "error";
    else if (data?.state) { current = mergeState(data.state as Partial<AppState>); storageMode = "cloud"; cloudStatus = "ready"; }
    else { cloudStatus = "ready"; void supabase.from("user_app_state").upsert({ user_id: user.id, state: current, updated_at: new Date().toISOString() }); }
  } else cloudStatus = "signed_out";
  listeners.forEach((listener) => listener());
}

function load() {
  if (loaded || typeof window === "undefined") return;
  reload();
  void loadCloud();
}

function subscribe(listener: () => void) {
  load();
  listeners.add(listener);
  const onExternal = () => {
    reload();
    listener();
  };
  window.addEventListener("two-goals-external", onExternal);
  window.addEventListener("storage", onExternal);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("two-goals-external", onExternal);
    window.removeEventListener("storage", onExternal);
  };
}

function getSnapshot() {
  load();
  return current;
}

function getServerSnapshot() {
  return defaultState;
}

function getStorageModeSnapshot() {
  load();
  return storageMode;
}

function getServerStorageModeSnapshot(): StorageMode {
  return "memory";
}

function emit(next: AppState) {
  current = next;
  persist(next);
  listeners.forEach((listener) => listener());
}

function parseBackup(raw: string): AppState {
  const parsed = JSON.parse(raw) as Partial<AppState> | Partial<BackupEnvelope>;
  if (!parsed || typeof parsed !== "object") {
    throw new Error("Backup file is not valid JSON data.");
  }

  if ("app" in parsed || "state" in parsed) {
    const envelope = parsed as Partial<BackupEnvelope>;
    if (envelope.app !== "two-goals" || !envelope.state) {
      throw new Error("This backup is not a Two Goals backup file.");
    }
    if (typeof envelope.version !== "number" || envelope.version > BACKUP_VERSION) {
      throw new Error("This backup was created by a newer version of Two Goals.");
    }
    return mergeState(envelope.state);
  }

  // Backward compatibility: accept a raw AppState export.
  return mergeState(parsed as Partial<AppState>);
}

export function useAppState() {
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const mode = useSyncExternalStore(
    subscribe,
    getStorageModeSnapshot,
    getServerStorageModeSnapshot
  );
  const hydrated = useSyncExternalStore(
    (onStoreChange) => {
      const id = window.setTimeout(onStoreChange, 0);
      return () => window.clearTimeout(id);
    },
    () => true,
    () => false
  );

  const setState = useCallback((updater: (previous: AppState) => AppState) => {
    load();
    emit(updater(current));
  }, []);

  const signIn = useCallback(async (email: string) => {
    const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.origin } });
    if (error) throw error;
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    cloudUserId = null;
    cloudEmail = null;
    cloudStatus = "signed_out";
    storageMode = "local";
    listeners.forEach((listener) => listener());
  }, []);

  const togglePractice = useCallback((date: string, kind: PracticeKind) => {
    setState((previous) => {
      const day = previous.practices[date] ?? emptyPractice();
      return {
        ...previous,
        practices: {
          ...previous.practices,
          [date]: { ...day, [kind]: !day[kind] },
        },
      };
    });
  }, [setState]);

  const exportBackup = useCallback(() => {
    load();
    const backup: BackupEnvelope = {
      app: "two-goals",
      version: BACKUP_VERSION,
      exportedAt: new Date().toISOString(),
      state: current,
    };
    return JSON.stringify(backup, null, 2);
  }, []);

  const importBackup = useCallback((raw: string) => {
    const next = parseBackup(raw);
    emit(next);
  }, []);

  const reset = useCallback(() => {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
    try {
      window.sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
    current = defaultState;
    storageMode = "memory";
    listeners.forEach((listener) => listener());
  }, []);

  return {
    state,
    setState,
    hydrated,
    storageMode: mode,
    cloudEmail,
    cloudStatus,
    signIn,
    signOut,
    togglePractice,
    exportBackup,
    importBackup,
    reset,
  };
}
