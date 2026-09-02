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

  function readState() {
    try {
      const raw = window.localStorage.getItem(KEY);
      if (raw) return { ...defaultState(), ...JSON.parse(raw) };
    } catch {
      /* keep working in memory */
    }
    return defaultState();
  }

  function writeState(state) {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* preview iframes can block storage */
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

  function saveFinance() {
    const ledger = readLedger();
    const state = readState();
    state.finance = { ...defaultState().finance, ...state.finance, ...ledger };
    writeState(state);
    updateSurplus(ledger);
    window.dispatchEvent(new Event("two-goals-external"));
  }

  function record() {
    const ledger = readLedger();
    const status = document.getElementById("ledger-status");
    const list = document.getElementById("ledger-snapshots");
    const empty = FIELD_IDS.every((id) => ledger[id] === 0);
    if (empty) {
      if (status) {
        status.hidden = false;
        status.textContent =
          "Type net worth, income, living, or giving first, then record today.";
      }
      return;
    }

    const date = todayKey();
    const snapshot = { date, ...ledger };
    const state = readState();
    state.finance = { ...defaultState().finance, ...state.finance, ...ledger };
    state.snapshots = [
      snapshot,
      ...(Array.isArray(state.snapshots) ? state.snapshots : []).filter(
        (item) => item && item.date !== date
      ),
    ];
    writeState(state);
    updateSurplus(ledger);
    window.dispatchEvent(new Event("two-goals-external"));

    if (status) {
      status.hidden = false;
      status.textContent = `Recorded ${formatShortDate(date)}: ${formatMoney(ledger.netWorth)} net, ${formatMoney(ledger.monthlyIncome)} income, ${formatMoney(ledger.monthlyExpenses)} living, ${formatMoney(ledger.monthlyGiving)} giving.`;
    }
    if (list) {
      list.innerHTML = state.snapshots.slice(0, 8).map(snapshotRow).join("");
    }
  }

  document.addEventListener(
    "pointerdown",
    (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.closest("[data-record-ledger]")) record();
    },
    true
  );

  document.addEventListener(
    "focusout",
    (event) => {
      if (!(event.target instanceof HTMLInputElement)) return;
      if (!FIELD_IDS.includes(event.target.id)) return;
      saveFinance();
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
})();
