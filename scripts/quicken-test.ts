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
assert.equal(qifPreview.accountAudit[0]?.classification, "cash");
assert.equal(qifPreview.accountAudit[1]?.classification, "invested");
assert.equal(qifPreview.accountAudit[2]?.classification, "debt");
assert.equal(qifPreview.transactionAudit.filter((item) => item.classification === "transfer").length, 1);
assert.equal(qifPreview.transactionAudit.find((item) => item.payee === "Church")?.classification, "giving");
assert.equal(qifPreview.monthlyAudit.length, 3);
assert.equal(qifPreview.monthlyAudit[0]?.income, 3000);
assert.equal(qifPreview.monthlyAudit[0]?.living, 1000);
assert.equal(qifPreview.monthlyAudit[0]?.giving, 300);
assert.equal(qifPreview.coverage.reviewAccounts, 0);
assert.ok(qifPreview.coverage.transactionCoverage > 0.9);

const csv = `Date,Account,Account Type,Payee,Category,Amount,Balance\n8/1/26,Checking,Bank,Employer,Salary,3000,12000\n8/2/26,Checking,Bank,Store,Household,-900,12000\n8/3/26,Checking,Bank,Church,Donation,-200,12000\n`;
const parsedCsv = parseCsv(csv);
assert.equal(parsedCsv.transactions.length, 3);
assert.equal(parsedCsv.accounts.length, 1);

const csvPreview = previewQuickenImport("transactions.csv", csv);
assert.equal(csvPreview.cash, 12000);
assert.equal(csvPreview.monthlyIncome, 3000);
assert.equal(csvPreview.monthlyExpenses, 900);
assert.equal(csvPreview.monthlyGiving, 200);
assert.equal(csvPreview.accountAudit[0]?.classification, "cash");
assert.equal(csvPreview.transactionAudit[2]?.classification, "giving");

const uncertainCsv = `Date,Account,Account Type,Payee,Category,Amount,Balance\n8/1/26,Mystery,,Deposit,,500,1000\n`;
const uncertain = previewQuickenImport("uncertain.csv", uncertainCsv);
assert.equal(uncertain.accountAudit[0]?.classification, "review");
assert.equal(uncertain.coverage.reviewAccounts, 1);
assert.equal(uncertain.transactionAudit[0]?.confidence, "low");

assert.throws(() => previewQuickenImport("archive.qxf", "anything"), /QXF is not supported yet/);

console.log("quicken tests passed");
