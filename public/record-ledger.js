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

  function formatPercent(value) {
    return `${Math.round(value * 1000) / 10}%`;
  }

  function formatShortDate(isoDate) {
    const [year, month, day] = isoDate.split("-").map(Number);
    return new Date(year, (month || 1) - 1, day || 1).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  function addMonths(date, months) {
    const next = new Date(date);
    next.setMonth(next.getMonth() + months);
    return next;
  }

  function formatMonthYear(date) {
    return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  }

  function formatDuration(months) {
    if (months === null) return "Not on a path yet";
    if (months <= 0) return "Already there";
    if (months < 1) return "This month";
    const total = Math.ceil(months);
    const years = Math.floor(total / 12);
    const remainingMonths = total % 12;
    if (years === 0) {
      return remainingMonths === 1 ? "1 month" : `${remainingMonths} months`;
    }
    if (remainingMonths === 0) {
      return years === 1 ? "1 year" : `${years} years`;
    }
    const yearLabel = years === 1 ? "1 year" : `${years} years`;
    const monthLabel =
      remainingMonths === 1 ? "1 month" : `${remainingMonths} months`;
    return `${yearLabel}, ${monthLabel}`;
  }

  function setText(id, value) {
    const node = document.getElementById(id);
    if (node) node.textContent = value;
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

  function financeFromPage() {
    const stored = { ...defaultState().finance, ...readState().finance };
    const onSteward = Boolean(document.getElementById("netWorth"));
    const ledger = onSteward ? readLedger() : {};
    const targetMonths = stored.targetMonths === 6 ? 6 : 12;
    return { ...stored, ...ledger, targetMonths };
  }

  function monthsToTarget({ present, target, monthlyContribution, annualRate }) {
    if (target <= 0) return null;
    if (present >= target) return 0;
    const monthlyRate = Math.pow(1 + annualRate, 1 / 12) - 1;
    if (Math.abs(monthlyRate) < 1e-12) {
      if (monthlyContribution <= 0) return null;
      return (target - present) / monthlyContribution;
    }
    const numerator = target * monthlyRate + monthlyContribution;
    const denominator = present * monthlyRate + monthlyContribution;
    if (denominator <= 0 || numerator / denominator <= 1) return null;
    return Math.log(numerator / denominator) / Math.log(1 + monthlyRate);
  }

  function futureValue({ present, monthlyContribution, months, annualRate }) {
    if (months <= 0) return present;
    const monthlyRate = Math.pow(1 + annualRate, 1 / 12) - 1;
    if (Math.abs(monthlyRate) < 1e-12) {
      return present + monthlyContribution * months;
    }
    const growth = Math.pow(1 + monthlyRate, months);
    return present * growth + monthlyContribution * ((growth - 1) / monthlyRate);
  }

  function requiredMonthlyContribution({ present, target, months, annualRate }) {
    if (present >= target) return 0;
    if (months <= 0) return Number.POSITIVE_INFINITY;
    const monthlyRate = Math.pow(1 + annualRate, 1 / 12) - 1;
    if (Math.abs(monthlyRate) < 1e-12) return (target - present) / months;
    const growth = Math.pow(1 + monthlyRate, months);
    return ((target - present * growth) * monthlyRate) / (growth - 1);
  }

  function requiredPresentValue({ target, monthlyContribution, months, annualRate }) {
    if (months <= 0) return target;
    const monthlyRate = Math.pow(1 + annualRate, 1 / 12) - 1;
    if (Math.abs(monthlyRate) < 1e-12) {
      return target - monthlyContribution * months;
    }
    const growth = Math.pow(1 + monthlyRate, months);
    const annuity = monthlyContribution * ((growth - 1) / monthlyRate);
    return (target - annuity) / growth;
  }

  function maxExpensesForDeadline({
    netWorth,
    monthlyIncome,
    monthlyGiving,
    months,
    annualRate,
    swr,
  }) {
    const withdrawal = swr > 0 ? swr : 0.04;
    const giving = Math.max(0, monthlyGiving);
    const hits = (expenses) => {
      const living = Math.max(0, expenses);
      const target = (12 * (living + giving)) / withdrawal;
      const contribution = monthlyIncome - living - giving;
      return (
        futureValue({
          present: Math.max(0, netWorth),
          monthlyContribution: contribution,
          months,
          annualRate,
        }) >=
        target - 0.5
      );
    };
    if (!hits(0)) return null;
    let low = 0;
    let high = Math.max(monthlyIncome, 1) * 4;
    if (hits(high)) return high;
    for (let index = 0; index < 48; index += 1) {
      const mid = (low + high) / 2;
      if (hits(mid)) low = mid;
      else high = mid;
    }
    return Math.max(0, Math.floor(low));
  }

  function independencePlan(finance) {
    const annualLiving = Math.max(0, finance.monthlyExpenses) * 12;
    const annualGiving = Math.max(0, finance.monthlyGiving) * 12;
    const annualSpend = annualLiving + annualGiving;
    const swr = finance.swr > 0 ? finance.swr / 100 : 0.04;
    const fiNumber = annualSpend > 0 ? annualSpend / swr : 0;
    const monthlySavings =
      finance.monthlyIncome - finance.monthlyExpenses - finance.monthlyGiving;
    const savingsRate =
      finance.monthlyIncome > 0 ? monthlySavings / finance.monthlyIncome : 0;
    const hasInputs =
      finance.netWorth > 0 ||
      finance.monthlyIncome > 0 ||
      finance.monthlyExpenses > 0 ||
      finance.monthlyGiving > 0;
    const reached = fiNumber > 0 && finance.netWorth >= fiNumber;
    const progress =
      fiNumber <= 0 ? 0 : Math.min(1, Math.max(0, finance.netWorth / fiNumber));
    const monthsRemaining = reached
      ? 0
      : monthsToTarget({
          present: Math.max(0, finance.netWorth),
          target: fiNumber,
          monthlyContribution: monthlySavings,
          annualRate: finance.expectedReturn / 100,
        });
    return {
      annualSpend,
      annualGiving,
      fiNumber,
      monthlySavings,
      savingsRate,
      progress,
      monthsRemaining,
      reached,
      hasInputs,
    };
  }

  function sprintPlan(finance) {
    const plan = independencePlan(finance);
    const months = finance.targetMonths === 6 ? 6 : 12;
    const annualRate = finance.expectedReturn / 100;
    const present = Math.max(0, finance.netWorth);
    const projectedNetWorth = futureValue({
      present,
      monthlyContribution: plan.monthlySavings,
      months,
      annualRate,
    });
    const reached = plan.reached;
    const requiredMonthlySavings = reached
      ? 0
      : Math.max(
          0,
          requiredMonthlyContribution({
            present,
            target: plan.fiNumber,
            months,
            annualRate,
          })
        );
    const extraMonthlySavings = Math.max(0, requiredMonthlySavings - plan.monthlySavings);
    const lumpSumNeeded = reached
      ? 0
      : Math.max(
          0,
          requiredPresentValue({
            target: plan.fiNumber,
            monthlyContribution: plan.monthlySavings,
            months,
            annualRate,
          }) - present
        );
    const onTrack =
      reached || (plan.fiNumber > 0 && projectedNetWorth >= plan.fiNumber - 1);
    const maxMonthlyExpenses = maxExpensesForDeadline({
      netWorth: present,
      monthlyIncome: finance.monthlyIncome,
      monthlyGiving: finance.monthlyGiving,
      months,
      annualRate,
      swr: finance.swr / 100,
    });
    const expenseCutNeeded =
      maxMonthlyExpenses === null
        ? 0
        : Math.max(0, finance.monthlyExpenses - maxMonthlyExpenses);
    const requiredMonthlyIncome =
      requiredMonthlySavings + finance.monthlyExpenses + finance.monthlyGiving;
    const incomeLift = Math.max(0, requiredMonthlyIncome - finance.monthlyIncome);
    return {
      months,
      onTrack,
      reached,
      requiredMonthlySavings,
      extraMonthlySavings,
      lumpSumNeeded,
      maxMonthlyExpenses,
      expenseCutNeeded,
      requiredMonthlyIncome,
      incomeLift,
      cutsAloneInsufficient: maxMonthlyExpenses === null && !reached,
    };
  }

  function nextMove(plan, sprint, finance) {
    const deadline = formatMonthYear(addMonths(new Date(), finance.targetMonths));
    if (!plan.hasInputs || plan.fiNumber <= 0) {
      return {
        kicker: "Your move",
        headline: "Enter living costs and giving. The three sizes fill in as you type.",
        lines: [
          "More invested each month: —",
          "Or a lump sum now: —",
          "Or a living ceiling: — (giving stays).",
        ],
        footer:
          "Living plus giving set the nest egg. Income and net worth then name the only three sizes that hit the deadline. Pick one and do it.",
      };
    }
    if (plan.reached) {
      return {
        kicker: "Your move",
        headline: "The money goal is met. Do not let it become the master.",
        lines: [
          "Keep giving. Do not inflate living just because the nest egg is big enough.",
          "Surplus this month is no longer the bottleneck.",
          "Protect the life you already funded.",
        ],
        footer: "Seek first the kingdom. The ledger’s job here is to keep the barn from owning you.",
      };
    }
    if (plan.monthlySavings < 0) {
      return {
        kicker: "Your move this month",
        headline: `Stop the bleed. This month the barn empties by ${formatMoney(Math.abs(plan.monthlySavings))}.`,
        lines: [
          "Cut living until take-home covers living plus giving. The 6–12 month sprint cannot start while net worth is falling.",
          sprint.lumpSumNeeded > 0
            ? `A lump sum of ${formatMoney(sprint.lumpSumNeeded)} would still close the nest-egg gap.`
            : "A lump sum cannot substitute for stopping the bleed.",
          sprint.cutsAloneInsufficient
            ? "Living cuts alone cannot hit this deadline. Stop the bleed first, then raise surplus."
            : `Live on ${formatMoney(sprint.maxMonthlyExpenses ?? 0)} if you want the date to stay possible.`,
        ],
        footer: "Giving can stay. The rest of the life has to fit.",
      };
    }
    if (sprint.onTrack) {
      return {
        kicker: "Your move this month",
        headline: `Keep investing ${formatMoney(plan.monthlySavings)} a month. Do not raise living costs.`,
        lines: [
          `That pace reaches the nest egg of ${formatMoney(plan.fiNumber)} in ${formatDuration(plan.monthsRemaining)} — inside the ${deadline} window.`,
          "Extra surplus needed this month: $0.",
          "Living can stay. Do not inflate it.",
        ],
        footer: "The help is protection: a bigger lifestyle is how this sprint dies.",
      };
    }
    return {
      kicker: "Your move this month — pick one",
      headline: `Current path misses ${deadline}. It takes ${formatDuration(plan.monthsRemaining)}.`,
      lines: [
        `Put ${formatMoney(sprint.extraMonthlySavings)} more into investments each month (take-home ${formatMoney(sprint.requiredMonthlyIncome)} if living and giving stay the same).`,
        sprint.lumpSumNeeded > 0
          ? `Or add ${formatMoney(sprint.lumpSumNeeded)} in cash once, now.`
          : "Or a lump sum is not required if surplus rises enough.",
        sprint.cutsAloneInsufficient
          ? "Cutting living costs alone cannot hit this deadline. It has to be more surplus or a lump sum."
          : sprint.expenseCutNeeded > 0
            ? `Or live on ${formatMoney(sprint.maxMonthlyExpenses ?? 0)} a month — cut ${formatMoney(sprint.expenseCutNeeded)} of living. Giving stays.`
            : "Living costs can stay. The bottleneck is surplus or a lump sum.",
      ],
      footer:
        "This page does not close the gap. Those three numbers are the only sizes that do. Pick one this week and run it.",
    };
  }

  function paintMove() {
    if (!document.getElementById("move-headline")) return;
    const finance = financeFromPage();
    const plan = independencePlan(finance);
    const sprint = sprintPlan(finance);
    const move = nextMove(plan, sprint, finance);
    const deadline = formatMonthYear(addMonths(new Date(), finance.targetMonths));
    setText("sprint-deadline", `Independent by ${deadline}.`);
    setText("move-kicker", move.kicker);
    setText("move-headline", move.headline);
    setText("move-line-surplus", move.lines[0] || "");
    setText("move-line-lump", move.lines[1] || "");
    setText("move-line-living", move.lines[2] || "");
    setText("move-footer", move.footer);
    setText("stat-fi", plan.fiNumber > 0 ? formatMoney(plan.fiNumber) : "—");
    setText("stat-have", plan.hasInputs ? formatMoney(finance.netWorth) : "—");
    setText(
      "stat-gap",
      plan.fiNumber > 0
        ? formatMoney(Math.max(0, plan.fiNumber - finance.netWorth))
        : "—"
    );

    const box = document.getElementById("move-box");
    if (box) {
      box.classList.remove("bg-steward", "bg-faith");
      box.classList.add(
        !plan.hasInputs || sprint.reached || sprint.onTrack ? "bg-steward" : "bg-faith"
      );
    }

    const ready = plan.hasInputs && plan.fiNumber > 0;
    setText(
      "lever-surplus-figure",
      ready ? formatMoney(sprint.extraMonthlySavings) : "—"
    );
    setText(
      "lever-surplus-body",
      !ready
        ? "Type living, giving, income, and net worth. This becomes the extra you must invest each month."
        : sprint.incomeLift > 0
          ? `Save or earn ${formatMoney(sprint.extraMonthlySavings)} more each month.`
          : `Put ${formatMoney(sprint.requiredMonthlySavings)} to investments each month.`
    );
    setText("lever-lump-figure", ready ? formatMoney(sprint.lumpSumNeeded) : "—");
    setText(
      "lever-living-figure",
      !ready
        ? "—"
        : sprint.cutsAloneInsufficient
          ? "Not enough"
          : formatMoney(sprint.maxMonthlyExpenses ?? 0)
    );
    setText(
      "lever-living-body",
      !ready
        ? "Giving stays. This becomes the most you can spend on living and still hit the date."
        : sprint.cutsAloneInsufficient
          ? "Living cuts alone cannot get there."
          : sprint.expenseCutNeeded > 0
            ? `Live on ${formatMoney(sprint.maxMonthlyExpenses ?? 0)}. Giving stays.`
            : "Living can stay. Surplus or a lump sum is the bottleneck."
    );

    const note = document.getElementById("sprint-on-track-note");
    if (note) {
      const sister = finance.targetMonths === 6 ? 12 : 6;
      note.hidden = !plan.hasInputs || !sprint.onTrack || sprint.reached;
      note.textContent = `Switch to ${sister} months if you want the tighter date. Savings rate ${formatPercent(plan.savingsRate)}.`;
    }

    document.querySelectorAll("[data-target-months]").forEach((button) => {
      const months = Number(button.getAttribute("data-target-months"));
      const selected = months === finance.targetMonths;
      button.classList.toggle("bg-steward", selected);
      button.classList.toggle("text-white", selected);
      button.classList.toggle("text-muted-foreground", !selected);
    });
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
    paintMove();
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
    paintMove();
    const status = document.getElementById("ledger-status");
    if (status && state.snapshots?.[0]) {
      const latest = state.snapshots[0];
      status.hidden = false;
      status.textContent = `Last saved ${formatShortDate(latest.date)}: ${formatMoney(latest.netWorth)} net, ${formatMoney(latest.monthlyIncome)} income, ${formatMoney(latest.monthlyExpenses)} living, ${formatMoney(latest.monthlyGiving)} giving.`;
    }
  }

  function setTargetMonths(months) {
    const next = months === 6 ? 6 : 12;
    const state = readState();
    state.finance = { ...defaultState().finance, ...state.finance, targetMonths: next };
    writeState(state);
    paintMove();
    window.dispatchEvent(new Event("two-goals-external"));
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
      const monthsButton = target.closest("[data-target-months]");
      if (monthsButton) {
        event.preventDefault();
        event.stopPropagation();
        setTargetMonths(Number(monthsButton.getAttribute("data-target-months")));
      }
    },
    true
  );

  document.addEventListener(
    "input",
    (event) => {
      if (!(event.target instanceof HTMLInputElement)) return;
      if (!FIELD_IDS.includes(event.target.id)) return;
      const ledger = readLedger();
      updateSurplus(ledger);
      paintMove();
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

  function boot() {
    restore();
    paintMove();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
  window.addEventListener("pageshow", boot);
  window.addEventListener("two-goals-external", paintMove);

  // React hydration in this preview can wipe restored fields and the painted
  // move. Re-apply stored numbers (skip the field being typed) and repaint.
  setInterval(() => {
    if (!document.getElementById("move-headline") && !document.getElementById("netWorth")) {
      return;
    }
    restore();
  }, 400);
})();
