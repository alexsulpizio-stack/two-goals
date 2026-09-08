# Two Goals — Context

**What it is:** A financial-planning web app built around personal financial goals, with Quicken data import.

**Repo:** `alexsulpizio-stack/two-goals` · **Deployed:** two-goals.vercel.app

---

## Direction

The app is mid-overhaul, not in maintenance. Al dislikes the existing flow — it was built before his current development approach — and has authorized dramatic changes. **Do not preserve a confusing workflow just because it already exists.**

---

## Product requirements

**Quicken imports must be auditable.** Al needs to see the detail behind an import to judge its accuracy, not just the resulting totals. Financial conclusions should trace back to source records. This shapes the data model, not just the UI. Open question: what reconciliation or validation display is actually needed beyond raw records.

**Built-in AI assistant for direction** — guidance on what to do next, not a generic chatbot. Scope is undecided: what data it can read, whether it calculates or only explains, whether it can recommend goal changes, whether conversations persist, whether it takes actions.

---

## Check these first

- **Is the Vercel deployment authenticated?** It's a public URL holding imported financial data.
- **Spending cap on the OpenAI key**, given auto-merge and auto-deploy are both on.
- **Repo HEAD vs. production** — confirm they're in sync and establish what the prior audit already landed.

---

## Open work

- **AI architecture undecided.** Vercel AI Gateway refused requests without a card on file; a direct OpenAI credential is now working (`provider: openai`, `model: gpt-5.6-luna`, `credentialSource: openai-key`). Unclear whether direct access is the permanent choice or a workaround. Don't fix the Gateway path without settling that.
- **Secrets** — verify keys are server-side and not reachable from the client.
- **"Window is not being updated with input values"** — reported earlier, resolution unknown. Retest.
- **End-to-end validation** never confirmed: inputs, goal calculations, persistence, import, import inspection, assistant, production behavior.

---

## Workflow

Auto-merge and auto-deploy are both enabled for this project by preference. Ship validated work rather than pausing for approval at each step — this does not extend to destructive operations or unrelated changes.

See `AGENTS.md` for working conventions.
