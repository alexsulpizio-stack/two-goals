# Two Goals

Two Goals is a local-first personal compass for two aims, held in this order:

1. **Live eternally with Jesus Christ**
2. **Live financially independent**

The first is a gift, not a score. The second is a stewardship problem that can be measured and acted on.

## Product flow

- **Today** — focused state of both goals, next actions, and AI Guide.
- **Walk** — today’s Word, prayer, gathered church, love of neighbor, prayer journal, and recent pattern.
- **Independence** — target, current capital, gap, income needed, Quicken import/audit, AI Guide, income plan, assumptions, and snapshots.

The former **Counsel** experience is the **Plan Assistant**, launched from Independence when help is needed turning an income gap into a practical week of work. The legacy **Steward** route redirects to Independence.

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:43147`.

Validation:

```bash
npm run lint
npm test
npm run build
```

## Data and privacy

Two Goals is local-first. It tries browser local storage first, then session storage, then in-memory state. Existing `two-goals:v1` data remains compatible.

Use **Export backup** to download a JSON backup containing practices, prayers, financial values, snapshots, and Plan Assistant answers. Backups are not encrypted.

## Quicken Classic audit

Independence imports **QIF** and **CSV** exports from Quicken Classic for Windows. The raw file is parsed in the browser and is not uploaded.

Before applying an import, Two Goals now exposes the evidence behind every headline value:

- every detected account, balance, classification, confidence, and reason
- every parsed transaction, classification, inclusion/exclusion decision, and confidence
- the exact months used for averages
- per-month income, living, giving, transfers, and row counts
- transaction/account classification coverage and items needing review
- warnings and unrecognized account types

Every suggested value can still be edited, unchecked, or approved before it changes Two Goals. QXF is not currently supported.

The optional **Ask Guide to audit** action sends only structured audit information. Transaction details are excluded unless the user explicitly checks the option to include up to 75 rows. The raw Quicken file is never sent to Guide.

## AI Guide

Guide is available on Today and Independence. It can explain calculations, challenge assumptions, identify the most important next action, and review a Quicken audit.

Guide calls OpenAI from a server-only Next.js route. No API key is exposed to browser code. Configure production/local environments with:

```bash
OPENAI_API_KEY=...
# optional; defaults to gpt-5-mini
OPENAI_MODEL=gpt-5-mini
```

Guide sends structured financial state, recent snapshots, and today’s practice completion. Prayer-journal text is never sent. Plan Assistant answers are excluded by default and can be included explicitly by the user.

## Independence model

Independence target:

`(annual living expenses + annual giving) / withdrawal rate`

Capital counted toward the target:

`invested assets + cash above emergency reserve - debt`

The 6- or 12-month plan compares required monthly saving with the current surplus and reports the additional take-home income needed. The estimated tax rate translates that gap into approximate gross income.

Defaults are a 5% real return and 4% withdrawal rate.

## Architecture

React state is the single source of truth. The former global DOM controller (`record-ledger.js`) is gone. Quicken parsing is client-side; AI calls are server-side.

This is a planning tool, not financial, tax, legal, or investment advice. Scripture quotations are from the World English Bible (public domain).
