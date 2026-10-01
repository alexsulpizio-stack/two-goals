# Working conventions

These apply to every project in this account. Project-specific state lives in `CONTEXT.md`.

## Code delivery

Give **complete replacement files**, not isolated snippets or "change line 42 to..." — unless a full replacement is genuinely impractical. Al shouldn't have to hunt through a file splicing in fragments.

## Learning Moments

When a technical concept comes up naturally during the work, add a short aside labeled:

> **Learning Moment:** ...

Keep them brief and tied to what's actually being built. They should get more advanced over time as understanding grows. They supplement the work; they don't replace doing it.

## Communication

Al states conclusions without spelling out the reasoning behind them. **A short answer is not a shallow one** — don't assume an omitted consideration was never considered. If the reasoning actually affects a decision, ask about it directly.

## Initiative

Proceed with the obvious next step rather than asking permission at each stage. After fixing something, say what should be validated or hardened next instead of stopping. Genuinely consequential ambiguities — architecture forks, anything destructive, anything that costs money — still get raised.

## Framing

Al is not approaching this as a career programmer. Explain what's changing, why, what it affects, what needs testing, and what actually requires a decision from him. Don't hand off manual implementation work that could be done directly.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
