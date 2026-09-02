(() => {
  const KEY = "two-goals:v1";
  const FIELD_IDS = ["netWorth", "monthlyExpenses", "monthlyGiving"];
  const INCOME_HINTS = ["Day job", "Side work", "Rental", "Freelance", "Business"];

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
        incomeSources: [{ id: "income-1", name: "", monthly: 0 }],
        nextStream: { name: "", monthly: 0, ask: "", status: "blank" },
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

  function newIncomeId() {
    return `income-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  }

  function normalizeIncomeSources(finance) {
    const raw = Array.isArray(finance?.incomeSources) ? finance.incomeSources : [];
    const parsed = [];
    const seen = new Set();
    for (const item of raw) {
      if (!item || typeof item !== "object") continue;
      const id = typeof item.id === "string" && item.id ? item.id : null;
      if (!id || seen.has(id)) continue;
      seen.add(id);
      parsed.push({
        id,
        name: typeof item.name === "string" ? item.name.trim().slice(0, 80) : "",
        monthly: parseMoney(item.monthly),
      });
    }
    if (parsed.length > 0) return parsed;
    const monthly = parseMoney(finance?.monthlyIncome);
    if (monthly > 0) {
      return [{ id: "income-legacy", name: "Take-home", monthly }];
    }
    return [{ id: "income-1", name: "", monthly: 0 }];
  }

  function totalIncome(sources) {
    return (sources || []).reduce((sum, source) => sum + Math.max(0, source.monthly || 0), 0);
  }

  function namedSources(sources) {
    return (sources || []).filter(
      (source) => (source.monthly || 0) > 0 || (source.name || "").length > 0
    );
  }

  function isStreamField(el) {
    return el.id === "stream-name" || el.id === "stream-monthly" || el.id === "stream-ask";
  }

  function isIncomeInput(input) {
    return input.hasAttribute("data-income-name") || input.hasAttribute("data-income-amount");
  }

  function readIncomeSources() {
    const rows = document.querySelectorAll("[data-income-source]");
    return Array.from(rows).map((row, index) => {
      const nameInput = row.querySelector("[data-income-name]");
      const amountInput = row.querySelector("[data-income-amount]");
      return {
        id: row.getAttribute("data-income-id") || `income-${index + 1}`,
        name:
          nameInput instanceof HTMLInputElement ? nameInput.value.trim().slice(0, 80) : "",
        monthly: parseMoney(amountInput instanceof HTMLInputElement ? amountInput.value : ""),
      };
    });
  }

  function incomeRowHtml(source, index) {
    const amount = source.monthly ? String(source.monthly) : "";
    const name = source.name || "";
    const hint = INCOME_HINTS[index % INCOME_HINTS.length];
    const removeHidden = "";
    return `<div data-income-source="" data-income-id="${source.id}" class="flex flex-col gap-2 sm:flex-row sm:items-center">
      <input data-income-name="" name="income-name-${source.id}" placeholder="${hint}" value="${escapeAttr(name)}" aria-label="Income source ${index + 1} name" class="h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base sm:flex-[1.2] md:text-sm" />
      <div class="relative sm:flex-1">
        <span class="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-sm text-muted-foreground">$</span>
        <input data-income-amount="" name="income-amount-${source.id}" inputmode="decimal" placeholder="0" value="${escapeAttr(amount)}" aria-label="Income source ${index + 1} amount" class="h-8 w-full min-w-0 rounded-lg border border-input bg-transparent py-1 pr-2.5 pl-6 text-base md:text-sm" />
      </div>
      <button type="button" data-remove-income="" ${removeHidden} class="h-8 shrink-0 text-sm text-muted-foreground underline-offset-4 hover:underline">Remove</button>
    </div>`;
  }

  function escapeAttr(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;");
  }

  function paintIncomeMeta(sources) {
    const filled = sources.filter((source) => source.monthly > 0);
    const total = totalIncome(sources);
    const note = document.getElementById("income-total");
    if (note) {
      note.textContent =
        total > 0
          ? `This month’s take-home: ${formatMoney(total)} from ${filled.length || sources.length} ${filled.length === 1 ? "source" : "sources"}.`
          : "Add every paycheck and side stream. Empty rows are ignored.";
    }
    const rows = document.querySelectorAll("[data-income-source]");
    rows.forEach((row) => {
      const button = row.querySelector("[data-remove-income]");
      if (button instanceof HTMLElement) button.hidden = rows.length < 2;
    });
  }

  function paintIncomeRows(sources) {
    const list = document.getElementById("income-sources");
    if (!list) return;
    const next = sources.length > 0 ? sources : [{ id: "income-1", name: "", monthly: 0 }];
    const active = document.activeElement;
    const activeRow = active instanceof HTMLElement ? active.closest("[data-income-source]") : null;
    const activeId = activeRow?.getAttribute("data-income-id") || "";
    const keepName = active instanceof HTMLInputElement && active.hasAttribute("data-income-name");
    const keepAmount = active instanceof HTMLInputElement && active.hasAttribute("data-income-amount");
    const keepValue = active instanceof HTMLInputElement ? active.value : "";
    const current = readIncomeSources();
    const same =
      current.length === next.length &&
      current.every((source, index) => source.id === next[index]?.id);

    if (!same) {
      list.innerHTML = next.map((source, index) => incomeRowHtml(source, index)).join("");
      if (activeId) {
        const row = list.querySelector(`[data-income-id="${CSS.escape(activeId)}"]`);
        const input = row?.querySelector(keepName ? "[data-income-name]" : keepAmount ? "[data-income-amount]" : "input");
        if (input instanceof HTMLInputElement) {
          input.value = keepValue;
          input.focus();
          input.selectionStart = input.selectionEnd = input.value.length;
        }
      }
    } else {
      const rows = list.querySelectorAll("[data-income-source]");
      next.forEach((source, index) => {
        const row = rows[index];
        if (!row) return;
        const nameInput = row.querySelector("[data-income-name]");
        const amountInput = row.querySelector("[data-income-amount]");
        if (nameInput instanceof HTMLInputElement && document.activeElement !== nameInput) {
          nameInput.value = source.name || "";
        }
        if (amountInput instanceof HTMLInputElement && document.activeElement !== amountInput) {
          amountInput.value = source.monthly ? String(source.monthly) : "";
        }
      });
    }
    paintIncomeMeta(next);
  }

  function persistSources(sources) {
    const state = readState();
    state.finance = {
      ...defaultState().finance,
      ...state.finance,
      incomeSources: sources,
      monthlyIncome: totalIncome(sources),
    };
    writeState(state);
    return state;
  }

  function addIncome() {
    const sources = readIncomeSources();
    sources.push({ id: newIncomeId(), name: "", monthly: 0 });
    persistSources(sources);
    paintIncomeRows(sources);
    paintMove();
    window.dispatchEvent(new Event("two-goals-external"));
    const names = document.querySelectorAll("[data-income-name]");
    const last = names[names.length - 1];
    if (last instanceof HTMLInputElement) last.focus();
  }

  function removeIncome(row) {
    const id = row?.getAttribute("data-income-id");
    let sources = readIncomeSources();
    if (sources.length <= 1) {
      sources = [{ id: sources[0]?.id || "income-1", name: "", monthly: 0 }];
    } else {
      sources = sources.filter((source) => source.id !== id);
    }
    persistSources(sources);
    paintIncomeRows(sources);
    updateSurplus(readLedger());
    paintMove();
    window.dispatchEvent(new Event("two-goals-external"));
  }

  function readLedger() {
    const sources = readIncomeSources();
    const ledger = {
      netWorth: 0,
      monthlyIncome: sources.length ? totalIncome(sources) : 0,
      monthlyExpenses: 0,
      monthlyGiving: 0,
      incomeSources: sources,
    };
    for (const id of FIELD_IDS) {
      const input = document.getElementById(id);
      ledger[id] = parseMoney(input instanceof HTMLInputElement ? input.value : "");
    }
    if (!sources.length) {
      const fallback = document.getElementById("monthlyIncome");
      ledger.monthlyIncome = parseMoney(
        fallback instanceof HTMLInputElement ? fallback.value : ""
      );
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

  function extraIncomeNeeded(sprint) {
    return Math.max(0, sprint.extraMonthlySavings);
  }

  function streamSplits(extra) {
    const one = Math.max(0, extra);
    return {
      one,
      two: one > 0 ? Math.round(one / 2) : 0,
      three: one > 0 ? Math.round(one / 3) : 0,
    };
  }

  function incomePlays(plan, sprint, ready) {
    const extra = extraIncomeNeeded(sprint);
    const splits = streamSplits(extra);
    if (!ready || plan.fiNumber <= 0) {
      return [
        {
          kicker: "Create this",
          title: "One new stream",
          figure: "—",
          figureNote: "new / month",
          body: "A client, a shift, a product, a room. Living plus giving set the size.",
        },
        {
          kicker: "Or split it",
          title: "Two smaller streams",
          figure: "—",
          figureNote: "each / month",
          body: "If one offer cannot carry the whole gap, start two.",
        },
        {
          kicker: "Or raise these",
          title: "More from work you have",
          figure: "—",
          figureNote: "more / month",
          body: "Raise a rate, add hours, or bill a project now. Do not start with a smaller life.",
        },
      ];
    }
    if (plan.reached || (sprint.onTrack && extra <= 0)) {
      return [
        {
          kicker: "Protect this",
          title: "Do not add lifestyle",
          figure: formatMoney(0),
          figureNote: "new / month required",
          body: "The date is in reach. New income is optional. Inflating living is how the sprint dies.",
        },
        {
          kicker: "Keep this",
          title: "Existing streams",
          figure: formatMoney(plan.monthlySavings),
          figureNote: "invested / month",
          body: "Keep giving. Keep the surplus working. Do not let a new want eat it.",
        },
        {
          kicker: "Skip this",
          title: "A smaller life",
          figure: "Not the plan",
          figureNote: "living cuts",
          body: "You do not need to shrink living to hit the date. Do not treat cuts as the work.",
        },
      ];
    }
    return [
      {
        kicker: "Create this",
        title: "One new stream",
        figure: formatMoney(splits.one),
        figureNote: "new / month",
        body: `Name a client, a shift, a product, or a room that pays ${formatMoney(splits.one)} every month. First dollar this month. Giving stays.`,
      },
      {
        kicker: "Or split it",
        title: "Two smaller streams",
        figure: formatMoney(splits.two),
        figureNote: "each / month",
        body:
          splits.three > 0
            ? `Two offers of ${formatMoney(splits.two)}, or three of ${formatMoney(splits.three)}. Same total. Easier to start.`
            : "Two smaller offers that add up to the monthly gap.",
      },
      {
        kicker: "Or raise these",
        title: "More from work you have",
        figure: formatMoney(splits.one),
        figureNote: "more / month",
        body:
          sprint.lumpSumNeeded > 0
            ? `Raise rates or hours on the streams already on the ledger. Or cash a project / sale once: ${formatMoney(sprint.lumpSumNeeded)}.`
            : "Raise rates or hours on the streams already on the ledger until the monthly gap is gone.",
      },
    ];
  }

  function livingFootnote(sprint, ready) {
    if (!ready) {
      return "A smaller life is not the plan. Create income. Giving stays in the target.";
    }
    if (sprint.cutsAloneInsufficient) {
      return "Living cuts alone cannot hit this deadline. The work is new income.";
    }
    if (sprint.expenseCutNeeded > 0) {
      return `Living cuts are a last resort, not the move: a ceiling of ${formatMoney(sprint.maxMonthlyExpenses ?? 0)} would also mathematically work. Create the income instead.`;
    }
    return "Living can stay. The bottleneck is income you have not created yet.";
  }

  function streamStatusCopy(status) {
    if (status === "earning") {
      return "This stream is on the ledger. If the gap remains, name the next one.";
    }
    if (status === "asked") {
      return "The ask is written. The next mark is the first dollar.";
    }
    if (status === "named") {
      return "Named. Write this week’s ask — a person, a price, a date.";
    }
    return "Name the stream you will create. The size is the monthly gap above.";
  }

  function deriveStreamStatus(stream) {
    if (stream.status === "earning") return "earning";
    if (stream.name && stream.ask) return "asked";
    if (stream.name) return "named";
    return "blank";
  }

  function readNextStream(suggested) {
    const nameInput = document.getElementById("stream-name");
    const monthlyInput = document.getElementById("stream-monthly");
    const askInput = document.getElementById("stream-ask");
    const name = nameInput instanceof HTMLInputElement ? nameInput.value.trim().slice(0, 80) : "";
    const monthly = parseMoney(monthlyInput instanceof HTMLInputElement ? monthlyInput.value : "");
    const ask =
      askInput instanceof HTMLTextAreaElement || askInput instanceof HTMLInputElement
        ? askInput.value.trim().slice(0, 280)
        : "";
    const stream = {
      name,
      monthly: monthly > 0 ? monthly : Math.max(0, suggested || 0),
      ask,
      status: "blank",
    };
    stream.status = deriveStreamStatus(stream);
    return stream;
  }

  function paintPlays(plan, sprint) {
    const ready = plan.hasInputs && plan.fiNumber > 0;
    const plays = incomePlays(plan, sprint, ready);
    const keys = ["surplus", "lump", "living"];
    plays.forEach((play, index) => {
      const key = keys[index];
      setText(`lever-${key}-kicker`, play.kicker);
      setText(`lever-${key}-title`, play.title);
      setText(`lever-${key}-figure`, play.figure);
      setText(`lever-${key}-note`, play.figureNote);
      setText(`lever-${key}-body`, play.body);
    });
    setText("living-footnote", livingFootnote(sprint, ready));
  }

  function paintStream(finance, sprint) {
    const suggested = extraIncomeNeeded(sprint);
    const stored = finance.nextStream || { name: "", monthly: 0, ask: "", status: "blank" };
    const nameInput = document.getElementById("stream-name");
    const monthlyInput = document.getElementById("stream-monthly");
    const askInput = document.getElementById("stream-ask");
    if (nameInput instanceof HTMLInputElement && document.activeElement !== nameInput) {
      nameInput.value = stored.name || "";
    }
    if (monthlyInput instanceof HTMLInputElement && document.activeElement !== monthlyInput) {
      if (stored.monthly > 0) {
        monthlyInput.value = String(Math.round(stored.monthly));
      } else if (!monthlyInput.value.trim() && suggested > 0) {
        monthlyInput.value = String(Math.round(suggested));
      }
    }
    if (
      (askInput instanceof HTMLTextAreaElement || askInput instanceof HTMLInputElement) &&
      document.activeElement !== askInput
    ) {
      askInput.value = stored.ask || "";
    }
    const preview = {
      name:
        nameInput instanceof HTMLInputElement && document.activeElement === nameInput
          ? nameInput.value.trim()
          : stored.name,
      monthly: stored.monthly,
      ask:
        askInput && document.activeElement === askInput
          ? String(askInput.value).trim()
          : stored.ask,
      status: stored.status,
    };
    setText("stream-status", streamStatusCopy(deriveStreamStatus(preview)));
  }

  function saveStream(statusOverride) {
    const finance = financeFromPage();
    const sprint = sprintPlan(finance);
    const stream = readNextStream(extraIncomeNeeded(sprint));
    if (statusOverride) stream.status = statusOverride;
    const state = readState();
    state.finance = {
      ...defaultState().finance,
      ...state.finance,
      nextStream: stream,
    };
    writeState(state);
    paintStream(state.finance, sprint);
    window.dispatchEvent(new Event("two-goals-external"));
    return stream;
  }

  function markStreamEarning() {
    const finance = financeFromPage();
    const sprint = sprintPlan(finance);
    const stream = readNextStream(extraIncomeNeeded(sprint));
    if (!stream.name || stream.monthly <= 0) {
      setText(
        "stream-status",
        "Name the stream and the monthly dollars first. Then the first dollar can land on the ledger."
      );
      return;
    }
    stream.status = "earning";
    const sources = readIncomeSources();
    const existing = sources.findIndex(
      (item) => item.name.toLowerCase() === stream.name.toLowerCase()
    );
    if (existing >= 0) {
      sources[existing].monthly = stream.monthly;
      sources[existing].name = stream.name;
    } else if (sources.length === 1 && !sources[0].name && sources[0].monthly === 0) {
      sources[0] = { id: sources[0].id || newIncomeId(), name: stream.name, monthly: stream.monthly };
    } else {
      sources.push({ id: newIncomeId(), name: stream.name, monthly: stream.monthly });
    }
    const state = readState();
    state.finance = {
      ...defaultState().finance,
      ...state.finance,
      incomeSources: sources,
      monthlyIncome: totalIncome(sources),
      nextStream: stream,
    };
    writeState(state);
    paintIncomeRows(sources);
    updateSurplus(readLedger());
    paintMove();
    setText("stream-status", streamStatusCopy("earning"));
    window.dispatchEvent(new Event("two-goals-external"));
  }

  function nextMove(plan, sprint, finance) {
    const deadline = formatMonthYear(addMonths(new Date(), finance.targetMonths));
    const extra = extraIncomeNeeded(sprint);
    const splits = streamSplits(extra);
    if (!plan.hasInputs || plan.fiNumber <= 0) {
      return {
        kicker: "Create income",
        headline: "Name the life to fund. Then this page sizes the income you still have to create.",
        lines: [
          "One new stream: — / month",
          "Or two smaller streams: — each",
          "Or raise what you already earn: — / month",
        ],
        footer:
          "Living plus giving set the nest egg. The gap is not a smaller life. It is work you have not named yet.",
      };
    }
    if (plan.reached) {
      return {
        kicker: "Your move",
        headline: "The money goal is met. Do not let it become the master.",
        lines: [
          "Keep giving. Do not inflate living just because the nest egg is big enough.",
          "You do not need another stream for the date. You may create one as overflow.",
          "Protect the life you already funded.",
        ],
        footer: "Seek first the kingdom. The ledger’s job here is to keep the barn from owning you.",
      };
    }
    if (plan.monthlySavings < 0) {
      return {
        kicker: "Create income this month",
        headline: `Create ${formatMoney(Math.max(extra, Math.abs(plan.monthlySavings)))} more take-home a month. Until it arrives the barn empties by ${formatMoney(Math.abs(plan.monthlySavings))}.`,
        lines: [
          `One new stream of ${formatMoney(splits.one)} covers the hole and starts the sprint.`,
          splits.two > 0
            ? `Or two streams of ${formatMoney(splits.two)} each.`
            : "Name the offer and make one ask this week.",
          "A smaller life can stop the bleed. It is not the first move. Create the income.",
        ],
        footer: "Giving can stay. Name the stream below and make the ask before you cut the life.",
      };
    }
    if (sprint.onTrack) {
      return {
        kicker: "Your move this month",
        headline: `Keep investing ${formatMoney(plan.monthlySavings)} a month. Do not raise living costs.`,
        lines: [
          `That pace reaches the nest egg of ${formatMoney(plan.fiNumber)} in ${formatDuration(plan.monthsRemaining)} — inside the ${deadline} window.`,
          "No new stream is required for this date.",
          "Creating extra income is overflow, not rescue. Do not spend it on a bigger life.",
        ],
        footer: "The help is protection: a bigger lifestyle is how this sprint dies.",
      };
    }
    return {
      kicker: "Create income this month",
      headline: `Current path misses ${deadline}. Create ${formatMoney(splits.one)} a month in new take-home.`,
      lines: [
        `One new stream of ${formatMoney(splits.one)} — a client, a shift, a product, a room.`,
        splits.two > 0
          ? `Or two streams of ${formatMoney(splits.two)} each (or three of ${formatMoney(splits.three)}).`
          : "Name the offer. Make one ask this week.",
        sprint.lumpSumNeeded > 0
          ? `Or raise the streams you already run by ${formatMoney(splits.one)} a month — or cash a project once: ${formatMoney(sprint.lumpSumNeeded)}.`
          : `Or raise the streams you already run by ${formatMoney(splits.one)} a month.`,
      ],
      footer:
        "Do not start with a smaller life. Name the stream, make one ask this week, and put the first dollar on the ledger.",
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

    paintPlays(plan, sprint);
    paintStream(finance, sprint);

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

    const assumptions = document.getElementById("fi-assumptions-copy");
    if (assumptions) {
      if (plan.fiNumber > 0) {
        const pace = plan.reached
          ? " You are there. Keep seeking the kingdom."
          : sprint.onTrack
            ? ` At this pace you arrive inside the ${finance.targetMonths}-month window.`
            : plan.monthsRemaining === null
              ? " Right now savings and returns are not climbing toward that number in time."
              : ` At this pace that is ${formatDuration(plan.monthsRemaining)} — outside the window. Use the sprint paths above.`;
        assumptions.textContent = `To fund ${formatMoney(plan.annualSpend)} a year — living plus giving — you need about ${formatMoney(plan.fiNumber)} invested.${pace}`;
      } else {
        assumptions.textContent =
          "Add living expenses and giving to see the nest egg that would fund them without a paycheck.";
      }
    }
  }

  function snapshotRow(item) {
    return `<li class="flex flex-col gap-1 border-b border-border/60 py-2 last:border-0">
      <span class="text-muted-foreground">${formatShortDate(item.date)}</span>
      <span class="tabular-nums">${formatMoney(item.netWorth)} net</span>
      <span class="text-xs text-muted-foreground tabular-nums">${formatMoney(item.monthlyIncome)} in${incomeHistorySuffix(item)} · ${formatMoney(item.monthlyExpenses)} living · ${formatMoney(item.monthlyGiving)} giving</span>
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

  function incomeHistorySuffix(item) {
    const sources = namedSources(item.incomeSources).filter((source) => source.monthly > 0);
    if (sources.length <= 1) return "";
    const parts = sources
      .map((source) => `${source.name || "Income"} ${formatMoney(source.monthly)}`)
      .join(" · ");
    return ` (${parts})`;
  }

  function emptyLedger(ledger) {
    return (
      ledger.netWorth === 0 &&
      ledger.monthlyIncome === 0 &&
      ledger.monthlyExpenses === 0 &&
      ledger.monthlyGiving === 0
    );
  }

  function saveLedger(makeSnapshot) {
    const ledger = readLedger();
    const state = readState();
    state.finance = {
      ...defaultState().finance,
      ...state.finance,
      ...ledger,
      incomeSources: ledger.incomeSources?.length
        ? ledger.incomeSources
        : normalizeIncomeSources({ ...state.finance, ...ledger }),
      monthlyIncome: ledger.monthlyIncome,
    };
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
    const finance = {
      ...defaultState().finance,
      ...state.finance,
      incomeSources: normalizeIncomeSources(state.finance),
    };
    finance.monthlyIncome = totalIncome(finance.incomeSources);
    for (const id of FIELD_IDS) {
      const input = document.getElementById(id);
      if (!(input instanceof HTMLInputElement)) continue;
      if (document.activeElement === input) continue;
      const value = finance[id];
      input.value = value ? String(value) : "";
    }
    paintIncomeRows(finance.incomeSources);
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
      if (target.closest("[data-add-income]")) {
        event.preventDefault();
        event.stopPropagation();
        addIncome();
      }
      if (target.closest("[data-save-stream]")) {
        event.preventDefault();
        event.stopPropagation();
        saveStream();
      }
      if (target.closest("[data-stream-earning]")) {
        event.preventDefault();
        event.stopPropagation();
        markStreamEarning();
      }
      const remove = target.closest("[data-remove-income]");
      if (remove) {
        event.preventDefault();
        event.stopPropagation();
        removeIncome(remove.closest("[data-income-source]"));
      }
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
      if (
        !FIELD_IDS.includes(event.target.id) &&
        !isIncomeInput(event.target) &&
        !isStreamField(event.target)
      ) {
        return;
      }
      const ledger = readLedger();
      paintIncomeMeta(ledger.incomeSources);
      updateSurplus(ledger);
      paintMove();
    },
    true
  );

  document.addEventListener(
    "focusout",
    (event) => {
      if (!(event.target instanceof HTMLInputElement)) return;
      if (
        !FIELD_IDS.includes(event.target.id) &&
        !isIncomeInput(event.target) &&
        !isStreamField(event.target)
      ) {
        return;
      }
      if (isStreamField(event.target)) {
        saveStream();
        return;
      }
      saveLedger(true);
    },
    true
  );

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    if (!(event.target instanceof HTMLInputElement)) return;
    if (!FIELD_IDS.includes(event.target.id) && !isIncomeInput(event.target)) return;
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
