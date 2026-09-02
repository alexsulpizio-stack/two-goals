(() => {
  const KEY = "two-goals:v1";

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
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: Math.abs(amount) >= 1000 ? 0 : 2,
    }).format(Math.abs(amount));
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

  function record() {
    const input = document.getElementById("netWorth");
    const raw = input instanceof HTMLInputElement ? input.value : "";
    const status = document.getElementById("net-worth-status");
    const list = document.getElementById("net-worth-snapshots");
    const trimmed = raw.trim();
    if (trimmed === "") {
      if (status) {
        status.hidden = false;
        status.textContent = "Type invested net worth first, then record it.";
      }
      return;
    }

    const netWorth = parseMoney(trimmed);
    const date = todayKey();
    const state = readState();
    state.finance = { ...defaultState().finance, ...state.finance, netWorth };
    state.snapshots = [
      { date, netWorth },
      ...(Array.isArray(state.snapshots) ? state.snapshots : []).filter(
        (item) => item && item.date !== date
      ),
    ];
    writeState(state);
    window.dispatchEvent(new Event("two-goals-external"));

    if (status) {
      status.hidden = false;
      status.textContent = `Recorded ${formatMoney(netWorth)} for ${formatShortDate(date)}.`;
    }
    if (list) {
      list.innerHTML = state.snapshots
        .slice(0, 8)
        .map(
          (item) =>
            `<li class="flex items-baseline justify-between text-sm"><span class="text-muted-foreground">${formatShortDate(item.date)}</span><span class="tabular-nums">${formatMoney(item.netWorth)}</span></li>`
        )
        .join("");
    }
  }

  document.addEventListener(
    "pointerdown",
    (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.closest("[data-record-net-worth]")) record();
    },
    true
  );

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    if (!(event.target instanceof HTMLInputElement)) return;
    if (event.target.id !== "netWorth") return;
    event.preventDefault();
    record();
  });
})();
