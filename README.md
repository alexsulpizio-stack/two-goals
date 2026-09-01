# Two Goals

A personal compass for two aims:

1. **To live eternally with Jesus Christ**
2. **To live financially independent**

The first is a gift, not a score. Eternal life is knowing the Father and the Son He sent. The Walk pages help you abide — Word, prayer, the gathered church, and love of neighbor — without pretending those practices earn heaven.

The second is stewardship on a deadline: independence in the next 6 to 12 months. The Steward ledger estimates a financial-independence number from the life you intend to fund, including giving, then reverse-calculates the monthly surplus, lump sum, or living-cost cut required to arrive on time. Numbers stay in your browser.

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:43147](http://localhost:43147).

- **Compass** — both goals, the verse of the day, and today’s practices
- **Walk** — abiding practices and a private prayer journal
- **Steward** — 6- or 12-month sprint, Quicken QIF/CSV import, FI number, and the three doors that close the gap

```bash
npm run lint
npm test
npm run build
```

## How independence is calculated

FI number = (annual living expenses + annual giving) ÷ safe withdrawal rate.

Years remaining assume monthly savings keep going and invested assets earn the real return you set. Default return is 5% after inflation; default withdrawal is 4%.

The 6- and 12-month sprint then asks the reverse question: what monthly surplus, lump sum today, or living-cost ceiling would actually hit that FI number inside the window. Cutting living costs is double-powerful — you save more and you need a smaller nest egg.

## Quicken

There is no Quicken API to log into. Export from the books you already keep, then drop the files on Steward:

1. **Transactions:** File → File Export → QIF file (include Transactions, Account List, and Category List). Or a Transaction report → Export to Excel → save as CSV.
2. **Balances:** a Net Worth report → Export to Excel → save as CSV.

The importer averages income, living costs, and giving over the last 3 or 12 months, skips transfers, treats tithe/charity categories as giving, and builds invested net worth from cash, brokerage, and retirement accounts (not the house). You can click a category to recast it before applying to the ledger. Nothing is uploaded.

This is a planning sketch, not advice. Scripture quotations are from the World English Bible (public domain).
