import assert from "node:assert/strict";

import { parseCsv, parseQif, previewQuickenImport } from "../src/lib/quicken";

const qif = `!Account
NChecking
TBank
$12000
^
!Account
NBrokerage
TInvst
$250000
^
!Account
NVisa
TCCard
$-4200
^
!Type:Bank
D6/01/26
T3000
PEmployer
LSalary
^
D6/04/26
T-1000
PGrocery and bills
LHousehold
^
D6/10/26
T-300
PChurch
LGiving:Tithe
^
D6/15/26
T-500
PTransfer
L[Savings]
^
D7/01/26
T3000
PEmployer
LSalary
^
D7/04/26
T-1000
PGrocery and bills
LHousehold
^
D7/10/26
T-300
PChurch
LCharity
^
D8/01/26
T3000
PEmployer
LSalary
^
D8/04/26
T-1000
PGrocery and bills
LHousehold
^
D8/10/26
T-300
PChurch
LChurch Offering
^
`;

const parsedQif = parseQif(qif);
assert.equal(parsedQif.accounts.length, 3);
assert.equal(parsedQif.transactions.length, 10);

const qifPreview = previewQuickenImport("quicken.qif", qif);
assert.equal(qifPreview.investedAssets, 250000);
assert.equal(qifPreview.cash, 12000);
assert.equal(qifPreview.debt, 4200);
assert.equal(qifPreview.monthlyIncome, 3000);
assert.equal(qifPreview.monthlyExpenses, 1000);
assert.equal(qifPreview.monthlyGiving, 300);
assert.deepEqual(qifPreview.monthsUsed, ["2026-06", "2026-07", "2026-08"]);

const csv = `Date,Account,Account Type,Payee,Category,Amount,Balance\n8/1/26,Checking,Bank,Employer,Salary,3000,12000\n8/2/26,Checking,Bank,Store,Household,-900,12000\n8/3/26,Checking,Bank,Church,Donation,-200,12000\n`;
const parsedCsv = parseCsv(csv);
assert.equal(parsedCsv.transactions.length, 3);
assert.equal(parsedCsv.accounts.length, 1);

const csvPreview = previewQuickenImport("transactions.csv", csv);
assert.equal(csvPreview.cash, 12000);
assert.equal(csvPreview.monthlyIncome, 3000);
assert.equal(csvPreview.monthlyExpenses, 900);
assert.equal(csvPreview.monthlyGiving, 200);

assert.throws(
  () => previewQuickenImport("archive.qxf", "anything"),
  /QXF is not supported yet/
);

console.log("quicken tests passed");
