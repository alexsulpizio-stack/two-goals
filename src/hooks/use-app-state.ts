"use client";

import { useCallback, useSyncExternalStore } from "react";

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
    snapshots: parsed.snapshots ?? defaultState.snapshots,
    categoryOverrides: parsed.categoryOverrides ?? defaultState.categoryOverrides,
    lastQuicken: parsed.lastQuicken ?? defaultState.lastQuicken,
  };
}

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) current = mergeState(JSON.parse(raw) as Partial<AppState>);
  } catch {
    window.localStorage.removeItem(STORAGE_KEY);
  }
}

function subscribe(listener: () => void) {
  load();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
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
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  listeners.forEach((listener) => listener());
}

export function useAppState() {
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const hydrated = useSyncExternalStore(
    () => () => undefined,
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
    window.localStorage.removeItem(STORAGE_KEY);
    emit(defaultState);
  }, []);

  return { state, setState, hydrated, togglePractice, reset };
}
