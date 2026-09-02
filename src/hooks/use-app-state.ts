"use client";

import { useCallback, useSyncExternalStore } from "react";

import { asLedgerSnapshots } from "@/lib/ledger";
import {
  defaultState,
  emptyPractice,
  type AppState,
  type PracticeKind,
  type SprintMonths,
} from "@/lib/types";

const STORAGE_KEY = "two-goals:v1";

let current: AppState = defaultState;
let loaded = false;
const listeners = new Set<() => void>();

function asSprintMonths(value: unknown): SprintMonths {
  return value === 6 ? 6 : 12;
}

function mergeState(parsed: Partial<AppState>): AppState {
  return {
    practices: parsed.practices ?? defaultState.practices,
    prayers: parsed.prayers ?? defaultState.prayers,
    finance: {
      ...defaultState.finance,
      ...parsed.finance,
      targetMonths: asSprintMonths(parsed.finance?.targetMonths),
    },
    snapshots: asLedgerSnapshots(parsed.snapshots),
  };
}

function readStored(): string | null {
  try {
    const local = window.localStorage.getItem(STORAGE_KEY);
    if (local) return local;
  } catch {
    /* blocked */
  }
  try {
    return window.sessionStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function reload() {
  if (typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = readStored();
    current = raw
      ? mergeState(JSON.parse(raw) as Partial<AppState>)
      : defaultState;
  } catch {
    current = defaultState;
  }
}

function persist(next: AppState) {
  const encoded = JSON.stringify(next);
  try {
    window.localStorage.setItem(STORAGE_KEY, encoded);
    return;
  } catch {
    /* try session */
  }
  try {
    window.sessionStorage.setItem(STORAGE_KEY, encoded);
  } catch {
    // Private mode or a sandboxed preview can block storage. Keep working in memory.
  }
}

function load() {
  if (loaded || typeof window === "undefined") return;
  reload();
}

function subscribe(listener: () => void) {
  load();
  listeners.add(listener);
  const onExternal = () => {
    reload();
    listener();
  };
  window.addEventListener("two-goals-external", onExternal);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("two-goals-external", onExternal);
  };
}

function getSnapshot() {
  load();
  return current;
}

function getServerSnapshot() {
  return defaultState;
}

function emit(next: AppState) {
  current = next;
  persist(next);
  listeners.forEach((listener) => listener());
}

export function useAppState() {
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const hydrated = useSyncExternalStore(
    (onStoreChange) => {
      const id = requestAnimationFrame(() => onStoreChange());
      return () => cancelAnimationFrame(id);
    },
    () => true,
    () => false
  );

  const setState = useCallback((updater: (previous: AppState) => AppState) => {
    load();
    emit(updater(current));
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
    emit(defaultState);
  }, []);

  return { state, setState, hydrated, togglePractice, reset };
}
