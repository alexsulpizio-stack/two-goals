import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { classifyCategory } from "../src/lib/quicken/classify";
import { parseCsvFile } from "../src/lib/quicken/csv";
import {
  parseQuickenFormData,
  parseQuickenSources,
  parseQuickenText,
} from "../src/lib/quicken/from-form";
import { parseAmount, parseDate } from "../src/lib/quicken/money";
import { decodeQuickenBytes, parseQuickenFile } from "../src/lib/quicken/parse";
import { parseQifFile } from "../src/lib/quicken/qif";
import { mergeBundles, summarizeQuicken } from "../src/lib/quicken/summarize";

const here = dirname(fileURLToPath(import.meta.url));

assert.equal(parseAmount("$1,234.50"), 1234.5);
assert.equal(parseAmount("(80.00)"), -80);
assert.equal(parseDate("3/15/2026"), "2026-03-15");
assert.equal(parseDate("2026-03-15"), "2026-03-15");

assert.equal(
  classifyCategory("Charitable Donations:Tithe", -800, {}),
  "giving"
);
assert.equal(classifyCategory("[Savings]", -2000, {}), "transfer");
assert.equal(
  classifyCategory("Salary", 8000, { Salary: "income" }),
  "income"
);
assert.equal(classifyCategory("Groceries", -520, {}, undefined, "Bank"), "expense");
assert.equal(classifyCategory("Amazon", 64.2, {}, undefined, "CCard"), "expense");

const qif = parseQifFile(
  "sample.qif",
  readFileSync(join(here, "fixtures/sample.qif"), "utf8")
);
assert.equal(qif.transactions.length, 7);
assert.equal(
  qif.transactions.filter((item) => item.category === "[Savings]").length,
  1
);
assert.equal(qif.categoryFlags.Salary, "income");

const qifSummary = summarizeQuicken(qif, 12);
assert.equal(qifSummary.monthlyIncome, 8000);
assert.equal(qifSummary.monthlyGiving, 800);
assert.equal(qifSummary.monthlyExpenses, 425);
assert.ok(qifSummary.warnings.some((line) => /net worth/i.test(line)));

const csv = parseCsvFile(
  "register.csv",
  `Date,Account,Payee,Category,Amount
1/15/2026,Checking,Employer,Salary,8000
1/15/2026,Checking,Church,Charitable Donations,-800
1/20/2026,Checking,Kroger,Groceries,-400
1/22/2026,Checking,Move,[Savings],-1500
2/15/2026,Checking,Employer,Salary,8000
2/15/2026,Checking,Church,Charitable Donations,-800
2/18/2026,Checking,Kroger,Groceries,"-450"`
);
assert.equal(csv.transactions.length, 7);

const balances = parseCsvFile(
  "net-worth.csv",
  `Net Worth as of 8/31/2026

Account,Balance
Checking,12000
Vanguard Brokerage,180000
401(k),90000
Home,400000
Visa,-800`
);
assert.equal(balances.accounts.length, 5);

const merged = mergeBundles([csv, balances]);
const summary = summarizeQuicken(merged, 12);
assert.equal(summary.monthlyIncome, 8000);
assert.equal(summary.monthlyGiving, 800);
assert.equal(summary.investedNetWorth, 281200);

const positional = parseCsvFile(
  "quicken-import.csv",
  `Date,Account,Tag,Category,Payee,Memo,Amount
3/1/2026,Checking,,Salary,Work,,5000.00
3/2/2026,Checking,,Groceries,Store,,-75.00`
);
assert.equal(positional.transactions.length, 2);

const qxf = parseQuickenFile("backup.qxf", "PK\x03\x04closed");
assert.ok(qxf.warnings[0]?.includes("QIF"));

const recategorized = summarizeQuicken(csv, 12, { Groceries: "giving" });
assert.ok(recategorized.monthlyGiving > summary.monthlyGiving);

assert.equal(parseDate("3/15'26"), "2026-03-15");
assert.equal(parseDate("3/15\u201926"), "2026-03-15");
assert.equal(parseDate("12/25'93"), "1993-12-25");

const apostropheQif = parseQifFile(
  "classic.qif",
  "!Type:Bank\r\nD3/15'26\r\nT-52.10\r\nPStore\r\nLGroceries\r\n^\r\n"
);
assert.equal(apostropheQif.transactions.length, 1);
assert.equal(apostropheQif.transactions[0]?.date, "2026-03-15");
assert.equal(apostropheQif.transactions[0]?.amount, -52.1);

const autoSwitch = parseQifFile(
  "auto.qif",
  `!Option:AutoSwitch
!Account
NChecking
TBank
^
!Type:Bank
D01/02/2026
T100.00
PPay
LSalary
^
`
);
assert.equal(autoSwitch.accounts.length, 1);
assert.equal(autoSwitch.transactions.length, 1);

const utf16 = new Uint8Array([
  0xff, 0xfe, 0x21, 0x00, 0x54, 0x00, 0x79, 0x00, 0x70, 0x00, 0x65, 0x00, 0x3a,
  0x00, 0x42, 0x00, 0x61, 0x00, 0x6e, 0x00, 0x6b, 0x00, 0x0a, 0x00,
]);
assert.match(decodeQuickenBytes(utf16.buffer), /!Type:Bank/);

const form = new FormData();
form.set(
  "paste",
  "!Type:Bank\nD3/15'26\nT-52.10\nPStore\nLGroceries\n^"
);
const fromForm = await parseQuickenFormData(form);
assert.equal(fromForm.ok, true);
assert.equal(fromForm.transactionCount, 1);
assert.equal(fromForm.fileName, "pasted.qif");

const emptyForm = await parseQuickenFormData(new FormData());
assert.equal(emptyForm.ok, false);

const named = await parseQuickenSources({
  files: [
    new File(
      [readFileSync(join(here, "fixtures/sample.qif"))],
      "2025data 11-18-2025.QIF",
      { type: "text/plain" }
    ),
  ],
});
assert.equal(named.ok, true);
assert.equal(named.fileName, "2025data 11-18-2025.QIF");
assert.equal(named.transactionCount, 7);

const nulled = parseQuickenFile(
  "n.qif",
  "!T\u0000y\u0000p\u0000e\u0000:\u0000B\u0000a\u0000n\u0000k\nD3/15'26\nT-5.00\nPStore\nLGroceries\n^"
);
assert.equal(nulled.transactions.length, 1);
assert.equal(nulled.transactions[0]?.amount, -5);

const fromText = parseQuickenText(
  "books.qif",
  "!Type:Bank\nD3/15'26\nT8000\nPWork\nLSalary\n^"
);
assert.equal(fromText.ok, true);
assert.equal(fromText.transactionCount, 1);

console.log("quicken tests passed");
