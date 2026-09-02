(() => {
  const KEY = "two-goals:v1";
  const FIELD_IDS = ["netWorth", "monthlyIncome", "monthlyExpenses", "monthlyGiving"];

  function parseMoney(raw) {
    const trimmed = String(raw ?? "").trim();
    if (trimmed === "") return 0;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function todayKey() {
    const date = new Date();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${date.getFullYear()}-${month}-${day}`;
  }

  function formatMoney(amount) {
    const signed = amount < 0 ? "−" : "";
    return (
      signed +
      new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: Math.abs(amount) >= 1000 ? 0 : 2,
      }).format(Math.abs(amount))
    );
  }

  function formatShortDate(isoDate) {
    const [year, month, day] = isoDate.split("-").map(Number);
    return new Date(year, (month || 1) - 1, day || 1).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  function defaultState() {
    return {
      practices: {},
      prayers: [],
      finance: {
        netWorth: 0,
        monthlyIncome: 0,
        monthlyExpenses: 0,
        monthlyGiving: 0,
        expectedReturn: 5,
        swr: 4,
        targetMonths: 12,
      },
      snapshots: [],
    };
  }

  function storage() {
    try {
      window.localStorage.setItem("__two-goals-probe", "1");
      window.localStorage.removeItem("__two-goals-probe");
      return { kind: "local", store: window.localStorage };
    } catch {
      /* try session */
    }
    try {
      window.sessionStorage.setItem("__two-goals-probe", "1");
      window.sessionStorage.removeItem("__two-goals-probe");
      return { kind: "session", store: window.sessionStorage };
    } catch {
      return { kind: "none", store: null };
    }
  }

  const bucket = storage();

  function readState() {
    if (!bucket.store) return defaultState();
    try {
      const raw = bucket.store.getItem(KEY);
      if (raw) return { ...defaultState(), ...JSON.parse(raw) };
    } catch {
      /* keep working in memory */
    }
    return defaultState();
  }

  function writeState(state) {
    if (!bucket.store) {
      paintSaveNote(false);
      return false;
    }
    try {
      bucket.store.setItem(KEY, JSON.stringify(state));
      paintSaveNote(true);
      return true;
    } catch {
      paintSaveNote(false);
      return false;
    }
  }

  function readLedger() {
    const ledger = {
      netWorth: 0,
      monthlyIncome: 0,
      monthlyExpenses: 0,
      monthlyGiving: 0,
    };
    for (const id of FIELD_IDS) {
      const input = document.getElementById(id);
      ledger[id] = parseMoney(input instanceof HTMLInputElement ? input.value : "");
    }
    return ledger;
  }

  function snapshotRow(item) {
    return `<li class="flex flex-col gap-1 border-b border-border/60 py-2 last:border-0">
      <span class="text-muted-foreground">${formatShortDate(item.date)}</span>
      <span class="tabular-nums">${formatMoney(item.netWorth)} net</span>
      <span class="text-xs text-muted-foreground tabular-nums">${formatMoney(item.monthlyIncome)} in · ${formatMoney(item.monthlyExpenses)} living · ${formatMoney(item.monthlyGiving)} giving</span>
    </li>`;
  }

  function paintSaveNote(ok) {
    const note = document.getElementById("ledger-save-note");
    if (!note) return;
    if (!ok || bucket.kind === "none") {
      note.textContent =
        "This browser blocked saving. Numbers will vanish when you leave. Download a copy below if you can.";
      return;
    }
    note.textContent =
      bucket.kind === "session"
        ? "Saved in this browser tab only. They disappear when the tab closes. Download a copy if you want a file."
        : "Saved in this browser on this device. Nothing is uploaded. History is below.";
  }

  function paintHistory(snapshots) {
    const list = document.getElementById("ledger-snapshots");
    const empty = document.getElementById("ledger-history-empty");
    const rows = Array.isArray(snapshots) ? snapshots : [];
    if (list) list.innerHTML = rows.slice(0, 12).map(snapshotRow).join("");
    if (empty) empty.hidden = rows.length > 0;
  }

  function updateSurplus(ledger) {
    const surplus = document.getElementById("ledger-surplus");
    if (!surplus) return;
    const amount = ledger.monthlyIncome - ledger.monthlyExpenses - ledger.monthlyGiving;
    surplus.hidden = false;
    surplus.textContent =
      amount >= 0
        ? `This month’s surplus: ${formatMoney(amount)} after living and giving.`
        : `This month the barn is emptying by ${formatMoney(Math.abs(amount))}.`;
  }

  function emptyLedger(ledger) {
    return FIELD_IDS.every((id) => ledger[id] === 0);
  }

  function saveLedger(makeSnapshot) {
    const ledger = readLedger();
    const state = readState();
    state.finance = { ...defaultState().finance, ...state.finance, ...ledger };
    if (makeSnapshot && !emptyLedger(ledger)) {
      const date = todayKey();
      const snapshot = { date, ...ledger };
      state.snapshots = [
        snapshot,
        ...(Array.isArray(state.snapshots) ? state.snapshots : []).filter(
          (item) => item && item.date !== date
        ),
      ];
    }
    writeState(state);
    updateSurplus(ledger);
    paintHistory(state.snapshots);
    window.dispatchEvent(new Event("two-goals-external"));
    return { ledger, state };
  }

  function record() {
    const status = document.getElementById("ledger-status");
    const { ledger, state } = saveLedger(true);
    if (emptyLedger(ledger)) {
      if (status) {
        status.hidden = false;
        status.textContent =
          "Type net worth, income, living, or giving first. Leaving a field also saves today’s row.";
      }
      return;
    }
    if (status) {
      status.hidden = false;
      status.textContent = `Saved ${formatShortDate(todayKey())}: ${formatMoney(ledger.netWorth)} net, ${formatMoney(ledger.monthlyIncome)} income, ${formatMoney(ledger.monthlyExpenses)} living, ${formatMoney(ledger.monthlyGiving)} giving.`;
    }
    paintHistory(state.snapshots);
  }

  function restore() {
    const state = readState();
    const finance = { ...defaultState().finance, ...state.finance };
    for (const id of FIELD_IDS) {
      const input = document.getElementById(id);
      if (!(input instanceof HTMLInputElement)) continue;
      if (document.activeElement === input) continue;
      const value = finance[id];
      input.value = value ? String(value) : "";
    }
    updateSurplus(finance);
    paintHistory(state.snapshots);
    paintSaveNote(bucket.kind !== "none");
    const status = document.getElementById("ledger-status");
    if (status && state.snapshots?.[0]) {
      const latest = state.snapshots[0];
      status.hidden = false;
      status.textContent = `Last saved ${formatShortDate(latest.date)}: ${formatMoney(latest.netWorth)} net, ${formatMoney(latest.monthlyIncome)} income, ${formatMoney(latest.monthlyExpenses)} living, ${formatMoney(latest.monthlyGiving)} giving.`;
    }
  }

  let lastDownloadAt = 0;

  function downloadHistory() {
    const now = Date.now();
    if (now - lastDownloadAt < 400) return;
    lastDownloadAt = now;
    const state = readState();
    const blob = new Blob([JSON.stringify(state, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `two-goals-ledger-${todayKey()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  document.addEventListener(
    "pointerdown",
    (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.closest("[data-record-ledger]")) record();
      if (target.closest("[data-download-ledger]")) downloadHistory();
    },
    true
  );

  document.addEventListener(
    "focusout",
    (event) => {
      if (!(event.target instanceof HTMLInputElement)) return;
      if (!FIELD_IDS.includes(event.target.id)) return;
      saveLedger(true);
    },
    true
  );

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    if (!(event.target instanceof HTMLInputElement)) return;
    if (!FIELD_IDS.includes(event.target.id)) return;
    event.preventDefault();
    record();
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", restore);
  } else {
    restore();
  }
  window.addEventListener("pageshow", restore);
})();
