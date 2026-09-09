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
assert.equal(parsedQif.repeatedAccountRecords, 0);

const qifPreview = previewQuickenImport("quicken.qif", qif, new Date(2026, 8, 8));
assert.equal(qifPreview.investedAssets, 250000);
assert.equal(qifPreview.cash, 12000);
assert.equal(qifPreview.debt, 4200);
assert.equal(qifPreview.monthlyIncome, 3000);
assert.equal(qifPreview.monthlyExpenses, 1000);
assert.equal(qifPreview.monthlyGiving, 300);
assert.deepEqual(qifPreview.monthsUsed, ["2026-06", "2026-07", "2026-08"]);
assert.equal(qifPreview.baselineTransactions, 9);
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

const creditCardWithCashInName = `!Account
NAmEx Blue Cash Preferred
TCCard
$-1250
^
`;
const creditCardPreview = previewQuickenImport("blue-cash.qif", creditCardWithCashInName);
assert.equal(creditCardPreview.accountAudit[0]?.classification, "debt");
assert.equal(creditCardPreview.accountAudit[0]?.confidence, "high");
assert.equal(creditCardPreview.debt, 1250);
assert.equal(creditCardPreview.cash, null);
assert.match(creditCardPreview.accountAudit[0]?.reason ?? "", /Quicken liability account type/);

const repeatedAccountQif = `!Account
NChecking
TBank
^
!Type:Bank
D1/05/26
T100
PDeposit
LIncome
^
!Account
NChecking
TBank
$1500
^
!Type:Bank
D2/05/26
T-50
PStore
LHousehold
^
`;
const repeatedAccountParsed = parseQif(repeatedAccountQif);
assert.equal(repeatedAccountParsed.accounts.length, 1);
assert.equal(repeatedAccountParsed.repeatedAccountRecords, 1);
assert.equal(repeatedAccountParsed.accounts[0]?.balance, 1500);
assert.equal(repeatedAccountParsed.transactions.length, 2);
const repeatedAccountPreview = previewQuickenImport("repeat.qif", repeatedAccountQif, new Date(2026, 8, 8));
assert.equal(repeatedAccountPreview.accounts, 1);
assert.equal(repeatedAccountPreview.repeatedAccountRecords, 1);
assert.match(repeatedAccountPreview.warnings.join(" "), /repeated QIF account record/);

const csv = `Date,Account,Account Type,Payee,Category,Amount,Balance\n8/1/26,Checking,Bank,Employer,Salary,3000,12000\n8/2/26,Checking,Bank,Store,Household,-900,12000\n8/3/26,Checking,Bank,Church,Donation,-200,12000\n`;
const parsedCsv = parseCsv(csv);
assert.equal(parsedCsv.transactions.length, 3);
assert.equal(parsedCsv.accounts.length, 1);
assert.equal(parsedCsv.repeatedAccountRecords, 0);

const csvPreview = previewQuickenImport("transactions.csv", csv, new Date(2026, 8, 8));
assert.equal(csvPreview.cash, 12000);
assert.equal(csvPreview.monthlyIncome, 3000);
assert.equal(csvPreview.monthlyExpenses, 900);
assert.equal(csvPreview.monthlyGiving, 200);
assert.equal(csvPreview.accountAudit[0]?.classification, "cash");
assert.equal(csvPreview.transactionAudit[2]?.classification, "giving");

const uncertainCsv = `Date,Account,Account Type,Payee,Category,Amount,Balance\n8/1/26,Mystery,,Deposit,,500,1000\n`;
const uncertain = previewQuickenImport("uncertain.csv", uncertainCsv, new Date(2026, 8, 8));
assert.equal(uncertain.accountAudit[0]?.classification, "review");
assert.equal(uncertain.coverage.reviewAccounts, 1);
assert.equal(uncertain.transactionAudit[0]?.confidence, "low");

const nonRoutineCsv = `Date,Account,Account Type,Payee,Category,Amount,Balance\n8/1/26,Checking,Bank,Employer,Salary,5000,12000\n8/2/26,Checking,Bank,AmEx,Credit Card Payment,-1500,12000\n8/3/26,Brokerage,Investment,Broker,Stock Sale,8000,50000\n8/4/26,Checking,Bank,Bank,HELOC Draw,10000,12000\n8/5/26,Checking,Bank,Employer,Expense Reimbursement,700,12000\n8/6/26,Checking,Bank,Grocer,Household,-1000,12000\n`;
const nonRoutine = previewQuickenImport("non-routine.csv", nonRoutineCsv, new Date(2026, 8, 8));
assert.equal(nonRoutine.monthlyIncome, 5000);
assert.equal(nonRoutine.monthlyExpenses, 1000);
assert.equal(nonRoutine.baselineTransactions, 2);
assert.equal(nonRoutine.transactionAudit.filter((item) => item.classification === "review").length, 4);
assert.equal(nonRoutine.transactionAudit.find((item) => item.category === "Credit Card Payment")?.includedInAverage, false);
assert.equal(nonRoutine.transactionAudit.find((item) => item.category === "Stock Sale")?.includedInAverage, false);
assert.equal(nonRoutine.transactionAudit.find((item) => item.category === "HELOC Draw")?.includedInAverage, false);
assert.equal(nonRoutine.transactionAudit.find((item) => item.category === "Expense Reimbursement")?.includedInAverage, false);
assert.match(nonRoutine.warnings.join(" "), /excluded from the baseline/);

const currentMonthQif = `!Type:Bank
D6/01/26
T1000
PIncome
LSalary
^
D7/01/26
T1000
PIncome
LSalary
^
D8/01/26
T1000
PIncome
LSalary
^
D9/01/26
T9000
PPartial month
LSalary
^
`;
const completedMonths = previewQuickenImport("current-month.qif", currentMonthQif, new Date(2026, 8, 8));
assert.deepEqual(completedMonths.monthsUsed, ["2026-06", "2026-07", "2026-08"]);
assert.equal(completedMonths.monthlyIncome, 1000);

assert.throws(() => previewQuickenImport("archive.qxf", "anything"), /QXF is not supported yet/);

console.log("quicken tests passed");
