# Two Goals

Two Goals is a local-first personal compass for two aims, held in this order:

1. **Live eternally with Jesus Christ**
2. **Live financially independent**

The first is a gift, not a score. The second is a stewardship problem that can be measured and acted on.

## Product flow

Two Goals 2.0 has three primary places:

- **Today** — a focused dashboard showing the state of both goals and the next action for each.
- **Walk** — today’s Word, prayer, gathered church, love of neighbor, prayer journal, and recent pattern.
- **Independence** — the financial target, current capital, gap, income needed, Quicken import, income plan, assumptions, and progress snapshots.

The former **Counsel** experience is now the **Plan Assistant**. It is launched from Independence when help is needed turning an income gap into a practical week of work. The legacy **Steward** route redirects to Independence.

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:43147`.

Validation commands:

```bash
npm run lint
npm test
npm run build
```

## Data and privacy

Two Goals is local-first. It tries browser local storage first, then session storage, then in-memory state. Existing `two-goals:v1` data remains compatible with the 2.0 interface.

Use **Export backup** to download a JSON backup containing practices, prayers, financial values, snapshots, and Plan Assistant answers. **Restore backup** validates and imports that file. Reset requires two confirmations.

Backups are not encrypted. Store them appropriately for the sensitivity of the information.

## Quicken Classic for Windows

Independence can import **QIF** and **CSV** exports from Quicken Classic for Windows. Files are parsed in the browser and are not uploaded by Two Goals.

The review screen can suggest:

- invested assets
- cash
- debt
- average monthly income
- average monthly living expenses
- average monthly giving

Every suggested value can be edited, unchecked, or approved before it changes Two Goals. QXF is not currently supported.

## Independence model

Independence target:

`(annual living expenses + annual giving) / withdrawal rate`

Capital counted toward the target:

`invested assets + cash above emergency reserve - debt`

The result is never allowed below zero.

The 6- or 12-month plan then calculates the monthly savings required to hit the target, compares that with the current monthly surplus, and reports the additional take-home income needed. The estimated tax rate translates that take-home gap into an approximate gross-income target.

Defaults are a 5% real return and 4% withdrawal rate. These assumptions can be changed under Advanced assumptions.

## Architecture

Two Goals 2.0 uses React state as the single source of truth. The previous global DOM controller (`record-ledger.js`) has been removed from the live application so UI state and financial calculations cannot be independently repainted by two systems.

This is a planning tool, not financial, tax, legal, or investment advice. Scripture quotations are from the World English Bible (public domain).
