import { describe, it, expect } from 'vitest';
import Big from 'big.js';
import { getTrialBalance, getProfitAndLoss, getBalanceSheet } from '../../src/services/reports.service';
import { testAccounts, createJE } from './setup';

describe('Trial Balance', () => {
  it('single balanced transaction', async () => {
    await createJE('2025-03-15', 'Client payment', [
      { accountId: testAccounts['10100'], debit: 1000 },
      { accountId: testAccounts['40000'], credit: 1000 },
    ]);

    const report = await getTrialBalance('2025-01-01', '2025-12-31');

    expect(report.isBalanced).toBe(true);
    expect(report.grandTotalDebit).toBe(1000);
    expect(report.grandTotalCredit).toBe(1000);
    expect(report.rows).toHaveLength(2);

    const bank = report.rows.find((r) => r.code === '10100')!;
    expect(bank.totalDebit).toBe(1000);
    expect(bank.totalCredit).toBe(0);
    expect(bank.balance).toBe(1000); // debit-normal

    const revenue = report.rows.find((r) => r.code === '40000')!;
    expect(revenue.totalDebit).toBe(0);
    expect(revenue.totalCredit).toBe(1000);
    expect(revenue.balance).toBe(1000); // credit-normal
  });

  it('multiple transactions across accounts', async () => {
    await createJE('2025-03-01', 'Revenue', [
      { accountId: testAccounts['10100'], debit: 5000 },
      { accountId: testAccounts['40000'], credit: 5000 },
    ]);
    await createJE('2025-03-05', 'Pay rent', [
      { accountId: testAccounts['60000'], debit: 1200 },
      { accountId: testAccounts['10100'], credit: 1200 },
    ]);
    await createJE('2025-03-10', 'Inventory purchase', [
      { accountId: testAccounts['50000'], debit: 2000 },
      { accountId: testAccounts['21500'], credit: 2000 },
    ]);

    const report = await getTrialBalance('2025-01-01', '2025-12-31');

    expect(report.isBalanced).toBe(true);
    expect(report.grandTotalDebit).toBe(8200);
    expect(report.grandTotalCredit).toBe(8200);
    expect(report.rows).toHaveLength(5);

    const bank = report.rows.find((r) => r.code === '10100')!;
    expect(bank.totalDebit).toBe(5000);
    expect(bank.totalCredit).toBe(1200);
    expect(bank.balance).toBe(3800);

    const rent = report.rows.find((r) => r.code === '60000')!;
    expect(rent.balance).toBe(1200);

    const ap = report.rows.find((r) => r.code === '21500')!;
    expect(ap.balance).toBe(2000); // credit-normal
  });

  it('filters by date range', async () => {
    await createJE('2025-01-15', 'Jan revenue', [
      { accountId: testAccounts['10100'], debit: 3000 },
      { accountId: testAccounts['40000'], credit: 3000 },
    ]);
    await createJE('2025-03-15', 'Mar revenue', [
      { accountId: testAccounts['10100'], debit: 7000 },
      { accountId: testAccounts['40000'], credit: 7000 },
    ]);
    await createJE('2025-06-15', 'Jun revenue', [
      { accountId: testAccounts['10100'], debit: 2000 },
      { accountId: testAccounts['40000'], credit: 2000 },
    ]);

    const report = await getTrialBalance('2025-03-01', '2025-03-31');

    expect(report.isBalanced).toBe(true);
    expect(report.grandTotalDebit).toBe(7000);
    expect(report.grandTotalCredit).toBe(7000);
    expect(report.rows).toHaveLength(2);
  });

  it('empty date range returns zero totals and no rows', async () => {
    await createJE('2025-06-15', 'Outside range', [
      { accountId: testAccounts['10100'], debit: 5000 },
      { accountId: testAccounts['40000'], credit: 5000 },
    ]);

    const report = await getTrialBalance('2025-01-01', '2025-01-31');

    expect(report.isBalanced).toBe(true);
    expect(report.grandTotalDebit).toBe(0);
    expect(report.grandTotalCredit).toBe(0);
    expect(report.rows).toHaveLength(0);
  });

  it('compound journal entry — one debit, multiple credits', async () => {
    await createJE('2025-03-15', 'Split payment', [
      { accountId: testAccounts['10100'], debit: 1000 },
      { accountId: testAccounts['60000'], credit: 600 },
      { accountId: testAccounts['50000'], credit: 400 },
    ]);

    const report = await getTrialBalance('2025-01-01', '2025-12-31');

    expect(report.isBalanced).toBe(true);
    expect(report.grandTotalDebit).toBe(1000);
    expect(report.grandTotalCredit).toBe(1000);
    expect(report.rows).toHaveLength(3);

    const bank = report.rows.find((r) => r.code === '10100')!;
    expect(bank.balance).toBe(1000);

    const rent = report.rows.find((r) => r.code === '60000')!;
    expect(rent.totalCredit).toBe(600);
    expect(rent.balance).toBe(-600); // debit-normal with only credits

    const cogs = report.rows.find((r) => r.code === '50000')!;
    expect(cogs.totalCredit).toBe(400);
    expect(cogs.balance).toBe(-400);
  });

  it('decimal precision with fractional cents', async () => {
    // 99.99 split as 33.33 + 33.33 + 33.33
    await createJE('2025-03-01', 'Split A', [
      { accountId: testAccounts['60000'], debit: 33.33 },
      { accountId: testAccounts['10100'], credit: 33.33 },
    ]);
    await createJE('2025-03-02', 'Split B', [
      { accountId: testAccounts['60000'], debit: 33.33 },
      { accountId: testAccounts['10100'], credit: 33.33 },
    ]);
    await createJE('2025-03-03', 'Split C', [
      { accountId: testAccounts['60000'], debit: 33.33 },
      { accountId: testAccounts['10100'], credit: 33.33 },
    ]);

    const report = await getTrialBalance('2025-01-01', '2025-12-31');

    expect(report.isBalanced).toBe(true);
    expect(report.grandTotalDebit).toBe(99.99);
    expect(report.grandTotalCredit).toBe(99.99);

    const rent = report.rows.find((r) => r.code === '60000')!;
    expect(rent.totalDebit).toBe(99.99);
    expect(rent.balance).toBe(99.99);
  });
});

describe('Profit and Loss', () => {
  it('revenue only — no expenses', async () => {
    await createJE('2025-03-15', 'Service revenue', [
      { accountId: testAccounts['10100'], debit: 15000 },
      { accountId: testAccounts['40000'], credit: 15000 },
    ]);

    const report = await getProfitAndLoss('2025-01-01', '2025-12-31');

    expect(report.income.total).toBe(15000);
    expect(report.income.accounts).toHaveLength(1);
    expect(report.costOfGoodsSold.total).toBe(0);
    expect(report.costOfGoodsSold.accounts).toHaveLength(0);
    expect(report.operatingExpenses.total).toBe(0);
    expect(report.otherIncomeExpenses.total).toBe(0);
    expect(report.grossProfit).toBe(15000);
    expect(report.netOperatingIncome).toBe(15000);
    expect(report.netIncome).toBe(15000);
  });

  it('full P&L with all sections', async () => {
    await createJE('2025-03-01', 'Revenue', [
      { accountId: testAccounts['10100'], debit: 50000 },
      { accountId: testAccounts['40000'], credit: 50000 },
    ]);
    await createJE('2025-03-05', 'COGS', [
      { accountId: testAccounts['50000'], debit: 15000 },
      { accountId: testAccounts['10100'], credit: 15000 },
    ]);
    await createJE('2025-03-10', 'Rent', [
      { accountId: testAccounts['60000'], debit: 8000 },
      { accountId: testAccounts['10100'], credit: 8000 },
    ]);
    await createJE('2025-03-15', 'Depreciation', [
      { accountId: testAccounts['80000'], debit: 2000 },
      { accountId: testAccounts['10100'], credit: 2000 },
    ]);

    const report = await getProfitAndLoss('2025-01-01', '2025-12-31');

    expect(report.income.total).toBe(50000);
    expect(report.costOfGoodsSold.total).toBe(15000);
    expect(report.grossProfit).toBe(35000);
    expect(report.operatingExpenses.total).toBe(8000);
    expect(report.netOperatingIncome).toBe(27000);
    expect(report.otherIncomeExpenses.total).toBe(2000);
    expect(report.netIncome).toBe(25000);
  });

  it('multi-period filtering — only queried period included', async () => {
    // Q1
    await createJE('2025-02-15', 'Q1 Revenue', [
      { accountId: testAccounts['10100'], debit: 20000 },
      { accountId: testAccounts['40000'], credit: 20000 },
    ]);
    await createJE('2025-02-20', 'Q1 Rent', [
      { accountId: testAccounts['60000'], debit: 3000 },
      { accountId: testAccounts['10100'], credit: 3000 },
    ]);
    // Q2
    await createJE('2025-05-15', 'Q2 Revenue', [
      { accountId: testAccounts['10100'], debit: 30000 },
      { accountId: testAccounts['40000'], credit: 30000 },
    ]);
    await createJE('2025-05-20', 'Q2 Rent', [
      { accountId: testAccounts['60000'], debit: 5000 },
      { accountId: testAccounts['10100'], credit: 5000 },
    ]);

    const report = await getProfitAndLoss('2025-04-01', '2025-06-30');

    expect(report.income.total).toBe(30000);
    expect(report.operatingExpenses.total).toBe(5000);
    expect(report.costOfGoodsSold.total).toBe(0);
    expect(report.otherIncomeExpenses.total).toBe(0);
    expect(report.netIncome).toBe(25000);
  });
});

describe('Balance Sheet', () => {
  it('assets = liabilities + equity', async () => {
    await createJE('2025-01-01', 'Owner investment', [
      { accountId: testAccounts['10100'], debit: 100000 },
      { accountId: testAccounts['31000'], credit: 100000 },
    ]);
    await createJE('2025-01-15', 'Bank loan', [
      { accountId: testAccounts['10100'], debit: 50000 },
      { accountId: testAccounts['25000'], credit: 50000 },
    ]);
    await createJE('2025-02-01', 'Buy equipment', [
      { accountId: testAccounts['15000'], debit: 30000 },
      { accountId: testAccounts['10100'], credit: 30000 },
    ]);

    const report = await getBalanceSheet('2025-12-31');

    expect(report.isBalanced).toBe(true);
    expect(report.totalAssets).toBe(150000);
    expect(report.totalLiabilities).toBe(50000);
    expect(report.equity.total).toBe(100000);
    expect(report.totalLiabilitiesAndEquity).toBe(150000);
    expect(Big(report.totalAssets).eq(Big(report.totalLiabilitiesAndEquity))).toBe(true);
  });

  it('net income flows into equity', async () => {
    await createJE('2025-01-01', 'Owner investment', [
      { accountId: testAccounts['10100'], debit: 50000 },
      { accountId: testAccounts['31000'], credit: 50000 },
    ]);
    await createJE('2025-06-15', 'Revenue', [
      { accountId: testAccounts['10100'], debit: 20000 },
      { accountId: testAccounts['40000'], credit: 20000 },
    ]);
    await createJE('2025-06-20', 'Rent', [
      { accountId: testAccounts['60000'], debit: 5000 },
      { accountId: testAccounts['10100'], credit: 5000 },
    ]);

    const report = await getBalanceSheet('2025-12-31');

    expect(report.isBalanced).toBe(true);
    expect(report.totalAssets).toBe(65000);
    expect(report.equity.total).toBe(65000);
    expect(report.equity.accounts).toHaveLength(2); // owner equity + NET-INCOME

    const netIncomeRow = report.equity.accounts.find((a) => a.code === 'NET-INCOME');
    expect(netIncomeRow).toBeDefined();
    expect(netIncomeRow!.balance).toBe(15000);

    expect(report.totalLiabilities).toBe(0);
    expect(report.totalLiabilitiesAndEquity).toBe(65000);
  });

  it('classifies current vs non-current correctly', async () => {
    // Owner invests
    await createJE('2025-01-01', 'Owner investment', [
      { accountId: testAccounts['10100'], debit: 200000 },
      { accountId: testAccounts['31000'], credit: 200000 },
    ]);
    // Non-current assets
    await createJE('2025-02-01', 'Buy equipment', [
      { accountId: testAccounts['15000'], debit: 40000 },
      { accountId: testAccounts['10100'], credit: 40000 },
    ]);
    await createJE('2025-02-15', 'Make investment', [
      { accountId: testAccounts['16000'], debit: 25000 },
      { accountId: testAccounts['10100'], credit: 25000 },
    ]);
    // Current liability
    await createJE('2025-03-01', 'Supplies on credit card', [
      { accountId: testAccounts['60000'], debit: 3000 },
      { accountId: testAccounts['21000'], credit: 3000 },
    ]);
    // Non-current liability
    await createJE('2025-03-15', 'Take loan', [
      { accountId: testAccounts['10100'], debit: 60000 },
      { accountId: testAccounts['25000'], credit: 60000 },
    ]);
    // Current asset (payment processor) + revenue
    await createJE('2025-04-01', 'Stripe settlement', [
      { accountId: testAccounts['10200'], debit: 10000 },
      { accountId: testAccounts['40000'], credit: 10000 },
    ]);

    const report = await getBalanceSheet('2025-12-31');

    expect(report.isBalanced).toBe(true);

    // Current Assets: bank (200000-40000-25000+60000=195000) + payment processor (10000) = 205000
    expect(report.currentAssets.total).toBe(205000);
    expect(report.currentAssets.accounts).toHaveLength(2);

    // Non-Current Assets: equipment (40000) + investments (25000) = 65000
    expect(report.nonCurrentAssets.total).toBe(65000);
    expect(report.nonCurrentAssets.accounts).toHaveLength(2);

    expect(report.totalAssets).toBe(270000);

    // Current Liabilities: credit card (3000)
    expect(report.currentLiabilities.total).toBe(3000);
    expect(report.currentLiabilities.accounts).toHaveLength(1);

    // Non-Current Liabilities: long-term loan (60000)
    expect(report.nonCurrentLiabilities.total).toBe(60000);
    expect(report.nonCurrentLiabilities.accounts).toHaveLength(1);

    expect(report.totalLiabilities).toBe(63000);

    // Equity: owner (200000) + net income (10000 revenue - 3000 rent = 7000) = 207000
    expect(report.equity.total).toBe(207000);
    expect(report.totalLiabilitiesAndEquity).toBe(270000);
  });
});
