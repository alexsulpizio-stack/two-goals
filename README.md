# Two Goals

A personal compass for two aims:

1. **To live eternally with Jesus Christ**
2. **To live financially independent**

The first is a gift, not a score. Eternal life is knowing the Father and the Son He sent. The Walk pages help you abide — Word, prayer, the gathered church, and love of neighbor — without pretending those practices earn heaven.

The second is stewardship. The Steward ledger estimates a financial-independence number from the life you actually intend to fund, including giving, then shows savings rate, years remaining, and a net-worth history. Numbers stay in your browser.

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:43147](http://localhost:43147).

- **Compass** — both goals, the verse of the day, and today’s practices
- **Walk** — abiding practices and a private prayer journal
- **Steward** — FI number, 4% rule, expected return, and snapshots

```bash
npm run lint
npm test
npm run build
```

## How independence is calculated

FI number = (annual living expenses + annual giving) ÷ safe withdrawal rate.

Years remaining assume monthly savings keep going and invested assets earn the real return you set. Default return is 5% after inflation; default withdrawal is 4%.

This is a planning sketch, not advice. Scripture quotations are from the World English Bible (public domain).
