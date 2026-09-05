# Two Goals

A personal compass for two aims:

1. **To live eternally with Jesus Christ**
2. **To live financially independent**

The first is a gift, not a score. Eternal life is knowing the Father and the Son He sent. The Walk pages help you abide — Word, prayer, the gathered church, and love of neighbor — without pretending those practices earn heaven.

The second is stewardship on a deadline: independence in the next 6 to 12 months. Steward sizes the nest egg from the life you intend to fund, including giving, then names the new monthly income you still have to create. A smaller life is not the plan. Enter numbers by hand. They stay in your browser.

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:43147](http://localhost:43147).

- **Compass** — both goals, the verse of the day, today’s practices, and one prioritized next action
- **Walk** — abiding practices and a private prayer journal
- **Steward** — 6- or 12-month sprint, plain-English income gap, gross-income estimate, scenario comparison, balance-sheet safety fields, trends, Quicken Classic import, a named stream for this week, and the ledger
- **Counsel** — a 22-question interview that turns your answers into this week’s actions, with honest confidence about what can and cannot be known yet; completed answers can be revised individually without restarting

```bash
npm run lint
npm test
npm run build
```

## Your data

Two Goals is local-first. It tries to save your entries in browser local storage. If that is unavailable, it falls back to session storage and then to in-memory state. The footer shows which storage mode is active.

Use **Export backup** to download a portable JSON backup containing your practices, prayers, financial entries, ledger history, and Counsel answers. **Restore backup** validates and imports that file. Reset requires two confirmations because it erases all locally stored Two Goals data.

Backups are not encrypted. Store them somewhere appropriate for the sensitivity of your prayers and financial information.

## Quicken Classic for Windows

Steward can import **QIF** and **CSV** exports from Quicken Classic for Windows. The file is parsed locally in the browser; Two Goals does not upload the raw Quicken export. Before anything changes, the importer shows a review screen where each detected value can be edited, unchecked, or approved.

When transaction history is present, Two Goals uses up to the three most recent months in the file to suggest average monthly income, living expenses, and giving. Transfers are ignored. Giving is detected from category names such as giving, tithe, charity, donation, offering, and ministry. Because category conventions vary, these are suggestions and should be reviewed before applying.

When recognizable account balances are present, the importer can also suggest invested assets, cash, and debt. Applying imported monthly income intentionally replaces the existing Steward income-source list with a single **Quicken average** source so the same income is not counted twice.

QXF files are not supported yet. Export QIF or CSV from Quicken Classic instead.

## How independence is calculated

FI number = (annual living expenses + annual giving) ÷ safe withdrawal rate.

Years remaining assume monthly savings keep going and invested assets earn the real return you set. Default return is 5% after inflation; default withdrawal is 4%.

The FI sprint continues to use the invested-assets ledger as its capital base so historical rows remain comparable. Steward now also tracks cash, an emergency reserve, and debt as a separate balance-sheet safety check rather than silently folding those balances into the historical FI series.

The 6- and 12-month sprint asks what new **take-home** income would actually hit that FI number inside the window. An optional estimated tax rate translates that take-home gap into an approximate gross-income target. Conservative, expected, and optimistic real-return scenarios show how sensitive the deadline is to the return assumption.

The ledger records what already exists. Steward leads with what you will create. Name the stream, write this week’s ask, and when the first dollar arrives, put it on the ledger. Giving stays in the target. The page does not earn the money. You make the ask.

Counsel interviews you before you invent a product. It is confident about the questions. It is only as confident about this week as your names, hours, and offer. It will not claim the 6–12 month date is honest if your hours × a rate you could get this month cannot cover the gap.

This is a planning sketch, not financial, tax, legal, or investment advice. Scripture quotations are from the World English Bible (public domain).
