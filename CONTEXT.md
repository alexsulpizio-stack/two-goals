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

## Security status

- **Guide access protection landed.** Production Guide requests now require a private session established with `GUIDE_ACCESS_PASSWORD` (minimum 12 characters). The session uses an HttpOnly, Secure, SameSite=Strict cookie and lasts 30 days.
- **Production fails closed.** If `GUIDE_ACCESS_PASSWORD` is missing or too short, Guide does not make AI requests.
- **Unlock attempts and Guide requests are rate limited.** These are process-local safeguards, so the password still needs to be long and unique.
- **AI credentials remain server-side.** The browser calls `/api/guide`; it does not receive the OpenAI or Gateway credential.
- **Deployment action required:** add `GUIDE_ACCESS_PASSWORD` to the Vercel project environment before expecting Guide to unlock in production.

---

## Check these first

- **Set and verify `GUIDE_ACCESS_PASSWORD` in Vercel.** Then confirm the production unlock flow works and an unauthenticated `/api/guide` request returns 401.
- **Spending cap on the OpenAI key**, given auto-merge and auto-deploy are both on.
- **Repo HEAD vs. production** — confirm they're in sync after the security deployment.

---

## Open work

- **AI architecture undecided.** Vercel AI Gateway refused requests without a card on file; a direct OpenAI credential is now working (`provider: openai`, `model: gpt-5.6-luna`, `credentialSource: openai-key`). Unclear whether direct access is the permanent choice or a workaround. Don't fix the Gateway path without settling that.
- **"Window is not being updated with input values"** — reported earlier, resolution unknown. Retest.
- **End-to-end validation** never confirmed: inputs, goal calculations, persistence, import, import inspection, assistant, production behavior.

---

## Workflow

Auto-merge and auto-deploy are both enabled for this project by preference. Ship validated work rather than pausing for approval at each step — this does not extend to destructive operations or unrelated changes.

See `AGENTS.md` for working conventions.
