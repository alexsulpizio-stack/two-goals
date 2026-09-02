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

  function todayKey(date) {
    date = date instanceof Date ? date : new Date();
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
      interview: { step: -1, answers: {}, completedAt: null },
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
    paintLife();
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

  function lastNDates(n) {
    const from = new Date();
    return Array.from({ length: n }, (_, index) => {
      const date = new Date(from);
      date.setDate(from.getDate() - (n - 1 - index));
      return todayKey(date);
    });
  }

  function formatLongDate(date) {
    date = date instanceof Date ? date : new Date();
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  }

  const PRACTICE_KINDS = ["word", "prayer", "gathered", "neighbor"];
  const CHECK_MARK =
    '<svg viewBox="0 0 24 24" fill="none" class="size-3.5" aria-hidden="true"><path d="M5 12.5 10 17.5 19 7.5" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" /></svg>';

  function emptyPractice() {
    return { word: false, prayer: false, gathered: false, neighbor: false };
  }

  function paintNav() {
    const path = window.location.pathname;
    document.querySelectorAll("[data-nav]").forEach((link) => {
      const href = link.getAttribute("data-nav");
      const active = href === "/" ? path === "/" : path.startsWith(href || "///");
      link.classList.toggle("bg-foreground", active);
      link.classList.toggle("text-background", active);
      link.classList.toggle("text-muted-foreground", !active);
    });
  }

  function paintPracticeBoxes(state) {
    const date = todayKey();
    const day = { ...emptyPractice(), ...(state.practices?.[date] || {}) };
    document.querySelectorAll("[data-practice]").forEach((button) => {
      const kind = button.getAttribute("data-practice");
      const checked = Boolean(kind && day[kind]);
      button.setAttribute("aria-pressed", checked ? "true" : "false");
      button.classList.toggle("border-faith/40", checked);
      button.classList.toggle("bg-faith/5", checked);
      const box = button.querySelector("[data-practice-box]");
      if (box) {
        box.classList.toggle("border-primary", checked);
        box.classList.toggle("bg-primary", checked);
        box.classList.toggle("text-primary-foreground", checked);
        box.classList.toggle("border-input", !checked);
        box.innerHTML = checked ? CHECK_MARK : "";
      }
    });
    const kept = PRACTICE_KINDS.filter((kind) => day[kind]).length;
    const abide = document.getElementById("abide-title");
    if (abide) {
      abide.textContent =
        kept === 0
          ? "Begin with Him"
          : kept === PRACTICE_KINDS.length
            ? "A full day of remaining"
            : `${kept} of ${PRACTICE_KINDS.length} kept`;
    }
    const week = lastNDates(7);
    PRACTICE_KINDS.forEach((kind) => {
      const count = week.filter((dayKey) => state.practices?.[dayKey]?.[kind]).length;
      document.querySelectorAll(`[data-week-count="${kind}"]`).forEach((node) => {
        node.textContent = `${count} of 7`;
      });
    });
    document.querySelectorAll("[data-week-dot]").forEach((dot) => {
      const kind = dot.getAttribute("data-week-kind");
      const dayKey = dot.getAttribute("data-week-date");
      const on = Boolean(kind && dayKey && state.practices?.[dayKey]?.[kind]);
      dot.classList.toggle("bg-faith", on);
      dot.classList.toggle("bg-muted", !on);
    });
  }

  function togglePractice(kind) {
    if (!PRACTICE_KINDS.includes(kind)) return;
    const state = readState();
    const date = todayKey();
    const day = { ...emptyPractice(), ...(state.practices?.[date] || {}) };
    day[kind] = !day[kind];
    state.practices = { ...(state.practices || {}), [date]: day };
    writeState(state);
    paintPracticeBoxes(state);
    window.dispatchEvent(new Event("two-goals-external"));
  }

  function prayerRow(entry) {
    const date = formatShortDate((entry.createdAt || "").slice(0, 10) || todayKey());
    const blocks = [
      entry.thanksgiving
        ? `<p class="text-sm leading-relaxed"><span class="font-medium">Thanksgiving. </span><span class="text-muted-foreground">${escapeAttr(entry.thanksgiving)}</span></p>`
        : "",
      entry.petition
        ? `<p class="text-sm leading-relaxed"><span class="font-medium">Petition. </span><span class="text-muted-foreground">${escapeAttr(entry.petition)}</span></p>`
        : "",
      entry.listening
        ? `<p class="text-sm leading-relaxed"><span class="font-medium">Heard. </span><span class="text-muted-foreground">${escapeAttr(entry.listening)}</span></p>`
        : "",
    ].join("");
    return `<li data-prayer-id="${escapeAttr(entry.id)}" class="flex flex-col gap-2 rounded-xl border border-border/80 p-4">
      <div class="flex items-center justify-between gap-3">
        <p class="text-xs tracking-wide text-muted-foreground uppercase">${date}</p>
        <button type="button" data-remove-prayer="${escapeAttr(entry.id)}" class="text-xs text-muted-foreground underline-offset-4 hover:text-destructive hover:underline">Remove</button>
      </div>
      ${blocks}
    </li>`;
  }

  function paintPrayers(state) {
    const list = document.getElementById("prayer-list");
    const empty = document.getElementById("prayer-empty");
    const title = document.getElementById("prayer-list-title");
    const prayers = Array.isArray(state.prayers) ? state.prayers : [];
    if (list) list.innerHTML = prayers.map(prayerRow).join("");
    if (empty) empty.hidden = prayers.length > 0;
    if (title) {
      title.textContent =
        prayers.length === 0 ? "Nothing written yet" : `${prayers.length} kept`;
    }
  }

  function fieldText(id) {
    const node = document.getElementById(id);
    if (node instanceof HTMLTextAreaElement || node instanceof HTMLInputElement) {
      return node.value.trim();
    }
    return "";
  }

  let lastPrayerAt = 0;

  function savePrayer() {
    const now = Date.now();
    if (now - lastPrayerAt < 400) return;
    lastPrayerAt = now;
    const thanksgiving = fieldText("thanksgiving");
    const petition = fieldText("petition");
    const listening = fieldText("listening");
    const error = document.getElementById("prayer-error");
    if (!thanksgiving && !petition && !listening) {
      if (error) {
        error.hidden = false;
        error.textContent = "Write at least one line before you keep it.";
      }
      return;
    }
    if (error) error.hidden = true;
    const entry = {
      id: `prayer-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
      createdAt: new Date().toISOString(),
      thanksgiving,
      petition,
      listening,
    };
    const state = readState();
    state.prayers = [entry, ...(Array.isArray(state.prayers) ? state.prayers : [])];
    writeState(state);
    ["thanksgiving", "petition", "listening"].forEach((id) => {
      const node = document.getElementById(id);
      if (node instanceof HTMLTextAreaElement || node instanceof HTMLInputElement) {
        node.value = "";
      }
    });
    paintPrayers(state);
    window.dispatchEvent(new Event("two-goals-external"));
  }

  function removePrayer(id) {
    if (!id) return;
    const state = readState();
    state.prayers = (Array.isArray(state.prayers) ? state.prayers : []).filter(
      (entry) => entry && entry.id !== id
    );
    writeState(state);
    paintPrayers(state);
    window.dispatchEvent(new Event("two-goals-external"));
  }

  function paintCompassMove() {
    const title = document.getElementById("compass-move-title");
    if (!title) return;
    const finance = financeFromPage();
    const plan = independencePlan(finance);
    const sprint = sprintPlan(finance);
    const move = nextMove(plan, sprint, finance);
    title.textContent = plan.hasInputs ? move.headline : "No finish line yet";
    const body = document.getElementById("compass-move-body");
    if (body) {
      if (plan.hasInputs) {
        body.innerHTML = `${move.lines[0] ? `<p>${escapeAttr(move.lines[0])}</p>` : ""}<a href="/steward" class="text-sm font-medium underline-offset-4 hover:underline">Do this on Steward</a>`;
      } else {
        const deadline = formatMonthYear(addMonths(new Date(), finance.targetMonths === 6 ? 6 : 12));
        body.innerHTML = `<p class="text-muted-foreground">Enter living and giving on Steward. Then it sizes the new income you still have to create by ${deadline}.</p>`;
      }
    }
    const percent = document.getElementById("fi-percent");
    if (percent) percent.textContent = `${Math.round((plan.progress || 0) * 100)}%`;
    const arc = document.getElementById("fi-progress-arc");
    if (arc) {
      const circumference = Number(arc.getAttribute("data-circumference") || 0);
      if (circumference > 0) {
        arc.setAttribute(
          "stroke-dashoffset",
          String(circumference * (1 - Math.min(1, Math.max(0, plan.progress || 0))))
        );
      }
    }
  }

  function interviewQuestions() {
    const node = document.getElementById("interview-questions");
    if (!node) return [];
    try {
      const parsed = JSON.parse(node.textContent || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function asInterview(value) {
    const empty = { step: -1, answers: {}, completedAt: null };
    if (!value || typeof value !== "object") return empty;
    const questions = interviewQuestions();
    const answers = {};
    const raw = value.answers && typeof value.answers === "object" ? value.answers : {};
    if (questions.length > 0) {
      questions.forEach((question) => {
        const text = raw[question.id];
        if (typeof text === "string") answers[question.id] = text.slice(0, 2000);
      });
    } else {
      Object.keys(raw).forEach((key) => {
        if (typeof raw[key] === "string") answers[key] = raw[key].slice(0, 2000);
      });
    }
    const step = Number(value.step);
    return {
      step: Number.isFinite(step) ? Math.trunc(step) : -1,
      answers,
      completedAt:
        typeof value.completedAt === "string" && value.completedAt
          ? value.completedAt
          : null,
    };
  }

  function parseAnswerNumber(raw) {
    if (!raw) return 0;
    const cleaned = String(raw).replace(/[^0-9.]/g, "");
    if (!cleaned) return 0;
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
  }

  function firstLine(raw, max) {
    const line = String(raw || "")
      .split(/\n/)[0]
      .trim();
    return line.slice(0, max || 80);
  }

  function namedPeople(raw) {
    if (!raw || !String(raw).trim()) return [];
    return String(raw)
      .split(/[\n;,]+|\s+and\s+|\s+&\s+/i)
      .map((part) => part.replace(/^[\s•\-]+/, "").trim())
      .filter((part) => part.length > 1 && !/^my network$/i.test(part))
      .slice(0, 8);
  }

  function monthlyCapacityFromAnswers(answers) {
    const hours = parseAnswerNumber(answers.hoursWeek);
    const rate = parseAnswerNumber(answers.honestRate);
    if (hours <= 0 || rate <= 0) return null;
    return hours * rate * (52 / 12);
  }

  function streamFromAnswers(answers, extraNeeded) {
    const offer = firstLine(answers.smallestOffer, 80);
    const gift = firstLine(answers.gift, 80);
    const skill = firstLine(answers.paidSkills, 80);
    const name = offer || gift || skill || "";
    const price = parseAnswerNumber(answers.price);
    const monthly = extraNeeded > 0 ? Math.round(extraNeeded) : price > 0 ? price : 0;
    const people = namedPeople(answers.namesThisMonth);
    const who =
      people.length > 0
        ? people.slice(0, 3).join(", ")
        : "three people who already know this work";
    const priceBit =
      price > 0
        ? ` at ${formatMoney(price)}`
        : extraNeeded > 0
          ? ` sized to ${formatMoney(monthly)} a month`
          : "";
    const offerBit = offer || name || "the smallest finished offer";
    const ask = name
      ? `This week ask ${who} to buy ${offerBit}${priceBit}.`
      : `Write three names, then ask them to buy the smallest finished offer${priceBit}.`;
    return { name, monthly, ask };
  }

  function deriveCounselJs(answers, sprint) {
    const questions = interviewQuestions();
    const extraNeeded = Math.max(0, sprint.extraMonthlySavings || 0);
    const hasFinishLine = Boolean(sprint.reached || sprint.onTrack || extraNeeded > 0);
    const hours = parseAnswerNumber(answers.hoursWeek);
    const rate = parseAnswerNumber(answers.honestRate);
    const capacity = monthlyCapacityFromAnswers(answers);
    const dateHonest = !hasFinishLine
      ? false
      : extraNeeded <= 0 || (capacity != null && capacity >= extraNeeded * 0.8);
    const filled = questions.filter((question) => (answers[question.id] || "").trim()).length;
    const total = questions.length || 22;
    const completeness = total > 0 ? filled / total : 0;
    const hasNames = namedPeople(answers.namesThisMonth).length > 0;
    const hasOffer = Boolean((answers.smallestOffer || "").trim());
    const hasHours = hours > 0;
    const hasRate = rate > 0;
    let nextWeek = "low";
    if (completeness >= 0.8 && hasNames && hasOffer && hasHours && hasRate) nextWeek = "high";
    else if (completeness >= 0.45 && (hasNames || hasOffer)) nextWeek = "medium";
    let date = "low";
    if (extraNeeded <= 0) date = hasFinishLine && dateHonest ? "medium" : "none";
    else if (!dateHonest) date = "none";
    else if (capacity != null && capacity >= extraNeeded * 0.8 && hasNames && hasOffer) date = "medium";
    const stream = streamFromAnswers(answers, extraNeeded);
    const weeklyAsk =
      extraNeeded > 0 ? Math.round(extraNeeded / (52 / 12)) : parseAnswerNumber(answers.price);
    const people = namedPeople(answers.namesThisMonth);
    const fences = [];
    if ((answers.refuse || "").trim()) fences.push(answers.refuse.trim());
    if (answers.givingStay === "no") {
      fences.push(
        "Do not pause giving to manufacture a surplus. Lower the giving line on Steward if it will not stay, so the nest egg is honest — or keep giving and create the income."
      );
    }
    if ((answers.quit || "").trim()) {
      fences.push(`You said you would quit if: ${answers.quit.trim()}`);
    }
    let honesty = "";
    if (!hasFinishLine) {
      honesty =
        "Enter living and giving on Steward so a nest egg exists. Then hours × a rate you could get this month can be tested against a real gap. I will not invent a finish line.";
    } else if (extraNeeded <= 0) {
      honesty =
        "The ledger already reaches the date if you do not inflate living. Counsel here is protection and overflow, not a rescue stream.";
    } else if (hours <= 0 || rate <= 0) {
      honesty =
        "I cannot tell whether the date is honest until you name hours you actually have and a rate a named person would pay this month.";
    } else if (!dateHonest && capacity != null) {
      honesty = `At ${hours} hours a week × ${formatMoney(rate)} an hour you can create about ${formatMoney(capacity)} a month. The sprint still needs ${formatMoney(extraNeeded)} in new take-home. That date is not honest unless you raise the rate, add hours without wrecking the walk, or move the window.`;
    } else if (capacity != null) {
      honesty = `Hours × rate can cover about ${formatMoney(capacity)} a month against a gap of ${formatMoney(extraNeeded)}. That is mathematically possible. It is not a yes from a buyer. The date stays unproven until the first invoice clears.`;
    } else {
      honesty = "Name hours and a rate so the date can be tested against capacity.";
    }
    const thisWeek = [];
    const competing = (answers.competing || "").trim();
    if (competing) {
      thisWeek.push({
        kicker: "Before the ask",
        title: "Put the walk before the competitor",
        body: `You named what wins the first hour: ${firstLine(competing, 160)}. Open the Word and pray before that thing gets the morning. The sprint is not allowed to eat Goal 01.`,
      });
    } else {
      thisWeek.push({
        kicker: "Before the ask",
        title: "Remain, then work",
        body: (answers.weekWithJesus || "").trim()
          ? answers.weekWithJesus.trim()
          : "Open the Word. Pray. Gather with the church. Love a neighbor. Then make the income ask. Order is not a slogan here.",
      });
    }
    if (people.length === 0) {
      thisWeek.push({
        kicker: "This week",
        title: "Write three names before you invent a product",
        body: "I will not name a winning offer for a market I cannot see. People who already know your work are the market you can reach this month. No names, no ask.",
      });
    } else {
      thisWeek.push({
        kicker: "This week",
        title: `Ask ${people.slice(0, 3).join(", ")}`,
        body: stream.ask,
      });
    }
    if ((answers.smallestOffer || "").trim()) {
      const price = parseAnswerNumber(answers.price);
      thisWeek.push({
        kicker: "The offer",
        title: firstLine(answers.smallestOffer, 80),
        body:
          price > 0
            ? `Charge ${formatMoney(price)}. Finish it in fourteen days. Put the first dollar on the Steward ledger when it arrives.`
            : "Name a price you can say out loud, then finish the work in fourteen days. A free sample is not a stream.",
      });
    } else if ((answers.gift || "").trim() || (answers.paidSkills || "").trim()) {
      thisWeek.push({
        kicker: "The offer",
        title: "Shrink the gift to a fourteen-day job",
        body: `You already have something people pay for: ${firstLine(answers.gift || answers.paidSkills, 120)}. Turn it into one named job with a date and a price. Do not start a brand.`,
      });
    }
    if (extraNeeded > 0) {
      thisWeek.push({
        kicker: "The size",
        title: weeklyAsk > 0 ? `This week must aim at ${formatMoney(weeklyAsk)}` : "Size the week to the gap on Steward",
        body:
          capacity != null
            ? `The month still needs ${formatMoney(extraNeeded)} in new take-home. Your hours × rate cover about ${formatMoney(capacity)} a month. ${dateHonest ? "The arithmetic can work." : "The arithmetic does not work yet."}`
            : `Steward still needs ${formatMoney(extraNeeded)} a month in new take-home. Name hours and a rate so this number can be tested.`,
      });
    }
    const walkActions = [
      {
        kicker: "Goal 01",
        title: "Live eternally with Jesus Christ",
        body: (answers.weekWithJesus || "").trim()
          ? answers.weekWithJesus.trim()
          : "Abide: Word, prayer, the gathered church, love of neighbor. Salvation is a gift. These are how a saved person remains.",
      },
    ];
    if ((answers.prayFor || "").trim()) {
      walkActions.push({ kicker: "Pray", title: "By name", body: answers.prayFor.trim() });
    }
    if ((answers.energy || "").trim()) {
      walkActions.push({ kicker: "Limits", title: "The week has a body", body: answers.energy.trim() });
    }
    const moneyActions = [];
    if (stream.name) {
      moneyActions.push({ kicker: "Goal 02", title: stream.name, body: stream.ask });
    } else {
      moneyActions.push({
        kicker: "Goal 02",
        title: extraNeeded > 0 ? `Create ${formatMoney(extraNeeded)} a month` : "Name the stream on Steward",
        body: "Counsel cannot pick the product until you name an offer and three people. The gap is on Steward. The work is the ask.",
      });
    }
    if ((answers.failedTries || "").trim()) {
      moneyActions.push({
        kicker: "Do not repeat",
        title: "You already learned this",
        body: answers.failedTries.trim(),
      });
    }
    if ((answers.reachWithoutAds || "").trim()) {
      moneyActions.push({
        kicker: "Reach",
        title: "Without ads this month",
        body: answers.reachWithoutAds.trim(),
      });
    }
    if ((answers.cashRisk || "").trim()) {
      const cash = parseAnswerNumber(answers.cashRisk);
      moneyActions.push({
        kicker: "Cash at risk",
        title: cash > 0 ? formatMoney(cash) : "None",
        body:
          cash > 0
            ? "Spend that on making the fourteen-day offer real. Not on a logo. Not on ads."
            : "Zero cash at risk means the offer is time and skill. Do not stock a store you cannot fill.",
      });
    }
    const floor = parseAnswerNumber(answers.floor);
    if (floor > 0) {
      moneyActions.push({
        kicker: "Household floor",
        title: `${formatMoney(floor)} a month must not break`,
        body: (answers.dependents || "").trim()
          ? answers.dependents.trim()
          : "If Steward’s living number is lower than this floor, the ledger is lying. Raise living to the floor, then create income.",
      });
    } else if ((answers.dependents || "").trim()) {
      moneyActions.push({
        kicker: "Must not break",
        title: "People first",
        body: answers.dependents.trim(),
      });
    }
    if ((answers.tuesday || "").trim()) {
      moneyActions.push({
        kicker: "The life",
        title: "A Tuesday you are actually funding",
        body: answers.tuesday.trim(),
      });
    }
    if ((answers.alreadyPays || "").trim()) {
      moneyActions.push({
        kicker: "Already paying",
        title: "Do not ignore what exists",
        body: answers.alreadyPays.trim(),
      });
    }
    if (answers.sellWhere === "online") {
      moneyActions.push({
        kicker: "Channel",
        title: "Online only is slower",
        body: "A first yes this month usually comes from a person you can stand in front of. If you cannot, then the list in “reach without ads” has to do that work. Do not buy traffic yet.",
      });
    }
    return {
      answered: filled,
      total,
      nextWeekConfidence: nextWeek,
      dateConfidence: date,
      dateHonest,
      honesty,
      stream,
      thisWeek,
      walkActions,
      moneyActions,
      fences,
    };
  }

  function labelLevel(level) {
    if (level === "none") return "None";
    if (level === "low") return "Low";
    if (level === "medium") return "Medium";
    return "High";
  }

  function actionGroupHtml(kicker, title, actions) {
    const items = (actions || [])
      .map(
        (action) => `<li class="flex flex-col gap-2 rounded-2xl border border-border/80 bg-card/80 p-5">
        <p class="text-xs tracking-[0.18em] text-muted-foreground uppercase">${escapeAttr(action.kicker)}</p>
        <h3 class="font-heading text-xl leading-tight">${escapeAttr(action.title)}</h3>
        <p class="text-sm leading-relaxed text-muted-foreground">${escapeAttr(action.body)}</p>
      </li>`
      )
      .join("");
    return `<div class="flex flex-col gap-3">
      <div>
        <p class="text-sm tracking-[0.18em] text-muted-foreground uppercase">${escapeAttr(kicker)}</p>
        <h2 class="font-heading text-2xl sm:text-3xl">${escapeAttr(title)}</h2>
      </div>
      <ol class="flex flex-col gap-3">${items}</ol>
    </div>`;
  }

  function confidenceCardHtml(level, title, body) {
    return `<div class="flex flex-col gap-3 rounded-2xl border border-border/80 bg-card/80 p-5">
      <p class="text-xs tracking-[0.18em] text-muted-foreground uppercase">${escapeAttr(level)}</p>
      <h2 class="font-heading text-xl leading-tight">${escapeAttr(title)}</h2>
      <p class="text-sm leading-relaxed text-muted-foreground">${escapeAttr(body)}</p>
    </div>`;
  }

  function reportHtml(report) {
    const weekBody =
      report.nextWeekConfidence === "high"
        ? "You named people, an offer, hours, and a rate. The list below is a week of work, not a vibe."
        : report.nextWeekConfidence === "medium"
          ? "Enough is here to start. Names and a fourteen-day offer would raise this."
          : "Too many blanks. The list below is still honest, and thinner than it should be.";
    const dateBody =
      report.dateConfidence === "none"
        ? "I will not bless a date the arithmetic cannot carry."
        : report.dateConfidence === "medium"
          ? "The hours × rate can cover the gap. A buyer has not said yes. That is not the same as arriving."
          : "Possible is not promised. The date stays unproven until money arrives.";
    const fences =
      report.fences.length > 0
        ? `<div class="flex flex-col gap-3 rounded-2xl border border-border/80 bg-card/80 p-5 sm:p-7">
        <p class="text-sm tracking-[0.18em] text-muted-foreground uppercase">Fences</p>
        <h2 class="font-heading text-2xl">Do not cross these to hit a date</h2>
        <ul class="flex flex-col gap-2">${report.fences
          .map((fence) => `<li class="text-sm leading-relaxed">${escapeAttr(fence)}</li>`)
          .join("")}</ul>
      </div>`
        : "";
    return `<div class="flex flex-col gap-6">
      <div class="grid gap-4 lg:grid-cols-3">
        ${confidenceCardHtml(labelLevel("high"), "The interview", `${report.answered} of ${report.total} answered. The questions were the right ones. Missing answers are missing facts, not a mystery about you.`)}
        ${confidenceCardHtml(labelLevel(report.nextWeekConfidence), "This week’s actions", weekBody)}
        ${confidenceCardHtml(labelLevel(report.dateConfidence), "The independence date", dateBody)}
      </div>
      <div class="rounded-2xl border px-5 py-4 text-sm leading-relaxed ${
        report.dateHonest ? "border-steward/30 bg-steward/10" : "border-faith/30 bg-faith/10"
      }">${escapeAttr(report.honesty)}</div>
      ${actionGroupHtml("Do these", "This week", report.thisWeek)}
      ${actionGroupHtml("Goal 01", "The walk", report.walkActions)}
      ${actionGroupHtml("Goal 02", "The stream", report.moneyActions)}
      ${fences}
      <div class="flex flex-wrap items-center gap-3">
        <button type="button" data-interview-apply-stream="" class="inline-flex h-11 items-center justify-center rounded-lg bg-steward px-5 text-sm font-medium text-white hover:bg-steward/90">Put this stream on Steward</button>
        <a href="/steward" class="inline-flex h-11 items-center justify-center rounded-lg border border-border bg-background px-4 text-sm font-medium hover:bg-muted">Open Steward</a>
        <button type="button" data-interview-retake="" class="inline-flex h-11 items-center justify-center rounded-lg px-4 text-sm font-medium text-muted-foreground underline-offset-4 hover:underline">Revise answers</button>
      </div>
      <p id="counsel-apply-note" class="text-sm text-muted-foreground" hidden></p>
    </div>`;
  }

  function collectInterviewAnswers(existing) {
    const answers = { ...(existing || {}) };
    document.querySelectorAll("[data-interview-field]").forEach((node) => {
      const id = node.getAttribute("data-interview-field");
      if (!id) return;
      if (node instanceof HTMLInputElement || node instanceof HTMLTextAreaElement) {
        answers[id] = node.value.slice(0, 2000);
      }
    });
    return answers;
  }

  function writeInterview(patch) {
    const state = readState();
    const current = asInterview(state.interview);
    const next = {
      step: patch.step !== undefined ? patch.step : current.step,
      answers: patch.answers || current.answers,
      completedAt:
        patch.completedAt !== undefined ? patch.completedAt : current.completedAt,
    };
    state.interview = next;
    writeState(state);
    window.dispatchEvent(new Event("two-goals-external"));
    return next;
  }

  function saveInterviewDraft() {
    const state = readState();
    const current = asInterview(state.interview);
    const answers = collectInterviewAnswers(current.answers);
    state.interview = { ...current, answers };
    writeState(state);
  }

  function paintInterview(forceReport) {
    const root = document.getElementById("counsel-root");
    if (!root) return;
    const questions = interviewQuestions();
    const state = readState();
    const interview = asInterview(state.interview);
    const complete = Boolean(interview.completedAt) || interview.step >= questions.length;
    const step = complete ? questions.length : interview.step;
    const showingIntro = !complete && step < 0;
    const questionIndex = complete ? questions.length : Math.max(0, step);
    const intro = document.getElementById("counsel-intro");
    const ask = document.getElementById("counsel-ask");
    const report = document.getElementById("counsel-report");
    if (intro) intro.hidden = !showingIntro;
    if (ask) ask.hidden = showingIntro || complete;
    if (report) report.hidden = !complete;
    const question = questions[Math.min(questionIndex, Math.max(0, questions.length - 1))];
    if (question) {
      setText("counsel-section", question.section);
      setText(
        "counsel-progress",
        `${Math.min(questionIndex + 1, questions.length)} of ${questions.length}`
      );
      const fill = document.getElementById("counsel-progress-fill");
      if (fill) {
        fill.style.width = `${((Math.min(questionIndex + 1, questions.length)) / questions.length) * 100}%`;
      }
    }
    questions.forEach((item, index) => {
      const card = document.querySelector(`[data-interview-q="${item.id}"]`);
      if (card) card.hidden = index !== questionIndex || showingIntro || complete;
    });
    const nextBtn = document.getElementById("counsel-next");
    if (nextBtn) {
      nextBtn.textContent =
        questionIndex >= questions.length - 1 ? "See this week’s actions" : "Next";
    }
    const active = document.activeElement;
    questions.forEach((item) => {
      const field = document.getElementById(`answer-${item.id}`);
      if (
        field instanceof HTMLInputElement ||
        field instanceof HTMLTextAreaElement
      ) {
        if (active === field) return;
        const value = interview.answers[item.id] || "";
        if (field.value !== value) field.value = value;
      }
      document.querySelectorAll(`[data-interview-choice="${item.id}"]`).forEach((button) => {
        const selected = interview.answers[item.id] === button.getAttribute("data-value");
        button.setAttribute("aria-pressed", selected ? "true" : "false");
        button.classList.toggle("border-faith/40", selected);
        button.classList.toggle("bg-faith/10", selected);
        button.classList.toggle("border-border", !selected);
        button.classList.toggle("bg-background", !selected);
      });
    });
    if (complete) {
      const body = document.getElementById("counsel-report-body");
      if (body && body.dataset.reactReport === "1" && !forceReport) {
        return;
      }
      if (body && (forceReport || body.dataset.painted !== "1")) {
        const finance = {
          ...defaultState().finance,
          ...state.finance,
          incomeSources: normalizeIncomeSources(state.finance),
        };
        const sprint = sprintPlan(finance);
        body.innerHTML = reportHtml(deriveCounselJs(interview.answers, sprint));
        body.dataset.painted = "1";
      }
    } else {
      const body = document.getElementById("counsel-report-body");
      if (body) body.dataset.painted = "";
    }
  }

  function interviewStart() {
    writeInterview({ step: 0, completedAt: null });
    paintInterview();
    document.getElementById("counsel-ask")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function interviewBack() {
    const state = readState();
    const current = asInterview(state.interview);
    const answers = collectInterviewAnswers(current.answers);
    const nextStep = current.step <= 0 ? -1 : current.step - 1;
    writeInterview({ step: nextStep, answers, completedAt: null });
    paintInterview();
  }

  function interviewNext() {
    const questions = interviewQuestions();
    const state = readState();
    const current = asInterview(state.interview);
    const answers = collectInterviewAnswers(current.answers);
    const last = Math.max(0, questions.length - 1);
    const atLast = current.step >= last;
    if (atLast) {
      writeInterview({
        step: questions.length,
        answers,
        completedAt: new Date().toISOString(),
      });
      paintInterview(true);
      document.getElementById("counsel-report")?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    const step = current.step < 0 ? 0 : current.step + 1;
    writeInterview({ step, answers, completedAt: null });
    paintInterview();
  }

  function interviewChoice(id, value) {
    if (!id || !value) return;
    const state = readState();
    const current = asInterview(state.interview);
    const answers = { ...collectInterviewAnswers(current.answers), [id]: value };
    writeInterview({ answers });
    paintInterview();
  }

  function interviewRetake() {
    const state = readState();
    const current = asInterview(state.interview);
    writeInterview({ step: 0, answers: current.answers, completedAt: null });
    paintInterview();
    document.getElementById("counsel-ask")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function interviewApplyStream() {
    const state = readState();
    const interview = asInterview(state.interview);
    const finance = {
      ...defaultState().finance,
      ...state.finance,
      incomeSources: normalizeIncomeSources(state.finance),
    };
    const sprint = sprintPlan(finance);
    const report = deriveCounselJs(interview.answers, sprint);
    if (!report.stream.name && !report.stream.ask) {
      const note = document.getElementById("counsel-apply-note");
      if (note) {
        note.hidden = false;
        note.textContent =
          "Name an offer and three people first, or write the stream by hand on Steward.";
      }
      return;
    }
    state.finance = {
      ...finance,
      nextStream: {
        name: report.stream.name,
        monthly: report.stream.monthly,
        ask: report.stream.ask,
        status: report.stream.name && report.stream.ask ? "asked" : "named",
      },
    };
    writeState(state);
    const note = document.getElementById("counsel-apply-note");
    if (note) {
      note.hidden = false;
      note.textContent = "Saved on Steward as this week’s stream. Open Steward to keep the ask.";
    }
    window.dispatchEvent(new Event("two-goals-external"));
  }

  function paintLife() {
    paintNav();
    const state = readState();
    paintPracticeBoxes(state);
    paintPrayers(state);
    paintCompassMove();
    paintInterview();
    setText("compass-date", formatLongDate());
    setText("walk-date", formatLongDate());
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
      if (target.closest("[data-save-prayer]")) {
        event.preventDefault();
        event.stopPropagation();
        savePrayer();
      }
      const removePrayerBtn = target.closest("[data-remove-prayer]");
      if (removePrayerBtn) {
        event.preventDefault();
        event.stopPropagation();
        removePrayer(removePrayerBtn.getAttribute("data-remove-prayer"));
      }
      const practice = target.closest("[data-practice]");
      if (practice) {
        event.preventDefault();
        event.stopPropagation();
        togglePractice(practice.getAttribute("data-practice"));
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
      if (target.closest("[data-interview-start]")) {
        event.preventDefault();
        event.stopPropagation();
        interviewStart();
      }
      if (target.closest("[data-interview-back]")) {
        event.preventDefault();
        event.stopPropagation();
        interviewBack();
      }
      if (target.closest("[data-interview-next]")) {
        event.preventDefault();
        event.stopPropagation();
        interviewNext();
      }
      if (target.closest("[data-interview-retake]")) {
        event.preventDefault();
        event.stopPropagation();
        interviewRetake();
      }
      if (target.closest("[data-interview-apply-stream]")) {
        event.preventDefault();
        event.stopPropagation();
        interviewApplyStream();
      }
      const choice = target.closest("[data-interview-choice]");
      if (choice) {
        event.preventDefault();
        event.stopPropagation();
        interviewChoice(
          choice.getAttribute("data-interview-choice"),
          choice.getAttribute("data-value")
        );
      }
    },
    true
  );

  document.addEventListener(
    "input",
    (event) => {
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement
      ) {
        if (event.target.hasAttribute("data-interview-field")) {
          saveInterviewDraft();
          return;
        }
      }
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
    paintLife();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
  window.addEventListener("pageshow", boot);
  window.addEventListener("two-goals-external", () => {
    paintMove();
    paintLife();
  });

  // React hydration in this preview can wipe restored fields and the painted
  // move. Re-apply stored numbers (skip the field being typed) and repaint.
  setInterval(() => {
    restore();
    paintLife();
  }, 400);
})();
