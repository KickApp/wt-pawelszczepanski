import Big from 'big.js';
import { db } from '../db/connection';
import {
  AccountClass,
  TrialBalanceReport,
  TrialBalanceRow,
  PnLReport,
  BalanceSheetReport,
} from '../types';
import { computeBalance, getBalanceSheetSection, getPnLSection } from '../utils/accounting';

async function getTrialBalanceRows(startDate: string, endDate: string): Promise<TrialBalanceRow[]> {
  const rows = await db('journal_entries as je')
    .join('accounts as a', 'je.account_id', 'a.id')
    .whereBetween('je.date', [startDate, endDate])
    .groupBy('a.id', 'a.code', 'a.name', 'a.class', 'a.type')
    .select(
      'a.code',
      'a.name',
      'a.class',
      'a.type',
      db.raw('COALESCE(SUM(je.debit_amount), 0)::numeric as total_debit'),
      db.raw('COALESCE(SUM(je.credit_amount), 0)::numeric as total_credit'),
    )
    .orderBy('a.code');

  return rows.map((row) => {
    const totalDebit = Big(row.total_debit).toNumber();
    const totalCredit = Big(row.total_credit).toNumber();
    return {
      code: row.code,
      name: row.name,
      class: row.class as AccountClass,
      type: row.type,
      totalDebit,
      totalCredit,
      balance: computeBalance(totalDebit, totalCredit, row.class as AccountClass),
    };
  });
}

export async function getTrialBalance(startDate: string, endDate: string): Promise<TrialBalanceReport> {
  const rows = await getTrialBalanceRows(startDate, endDate);

  const grandTotalDebit = rows.reduce((sum, r) => sum.plus(r.totalDebit), Big(0));
  const grandTotalCredit = rows.reduce((sum, r) => sum.plus(r.totalCredit), Big(0));

  return {
    startDate,
    endDate,
    rows,
    grandTotalDebit: grandTotalDebit.toNumber(),
    grandTotalCredit: grandTotalCredit.toNumber(),
    isBalanced: grandTotalDebit.minus(grandTotalCredit).abs().lte(0.01),
  };
}

export async function getProfitAndLoss(startDate: string, endDate: string): Promise<PnLReport> {
  const allRows = await getTrialBalanceRows(startDate, endDate);

  const ieRows = allRows.filter(
    (r) => r.class === AccountClass.Income || r.class === AccountClass.Expenses,
  );

  const sections = {
    income: { accounts: [] as TrialBalanceRow[], total: Big(0) },
    cogs: { accounts: [] as TrialBalanceRow[], total: Big(0) },
    operatingExpenses: { accounts: [] as TrialBalanceRow[], total: Big(0) },
    otherIncomeExpenses: { accounts: [] as TrialBalanceRow[], total: Big(0) },
  };

  for (const row of ieRows) {
    const section = getPnLSection(row.code);
    sections[section].accounts.push(row);
    sections[section].total = sections[section].total.plus(row.balance);
  }

  const grossProfit = sections.income.total.minus(sections.cogs.total);
  const netOperatingIncome = grossProfit.minus(sections.operatingExpenses.total);
  const netIncome = netOperatingIncome.minus(sections.otherIncomeExpenses.total);

  return {
    startDate,
    endDate,
    income: { label: 'Income', accounts: sections.income.accounts, total: sections.income.total.toNumber() },
    costOfGoodsSold: { label: 'Cost of Goods Sold', accounts: sections.cogs.accounts, total: sections.cogs.total.toNumber() },
    grossProfit: grossProfit.toNumber(),
    operatingExpenses: { label: 'Operating Expenses', accounts: sections.operatingExpenses.accounts, total: sections.operatingExpenses.total.toNumber() },
    netOperatingIncome: netOperatingIncome.toNumber(),
    otherIncomeExpenses: { label: 'Other Income/Expenses', accounts: sections.otherIncomeExpenses.accounts, total: sections.otherIncomeExpenses.total.toNumber() },
    netIncome: netIncome.toNumber(),
  };
}

export async function getBalanceSheet(asOfDate: string): Promise<BalanceSheetReport> {
  const allRows = await getTrialBalanceRows('1900-01-01', asOfDate);

  const bsRows = allRows.filter(
    (r) =>
      r.class === AccountClass.Assets ||
      r.class === AccountClass.Liabilities ||
      r.class === AccountClass.Equity,
  );

  const currentAssets: TrialBalanceRow[] = [];
  const nonCurrentAssets: TrialBalanceRow[] = [];
  const currentLiabilities: TrialBalanceRow[] = [];
  const nonCurrentLiabilities: TrialBalanceRow[] = [];
  const equityAccounts: TrialBalanceRow[] = [];

  for (const row of bsRows) {
    const section = getBalanceSheetSection(row.class, row.type);
    switch (section) {
      case 'Current Assets': currentAssets.push(row); break;
      case 'Non-Current Assets': nonCurrentAssets.push(row); break;
      case 'Current Liabilities': currentLiabilities.push(row); break;
      case 'Non-Current Liabilities': nonCurrentLiabilities.push(row); break;
      case 'Equity': equityAccounts.push(row); break;
    }
  }

  const fiscalYearStart = `${asOfDate.slice(0, 4)}-01-01`;
  const pnl = await getProfitAndLoss(fiscalYearStart, asOfDate);

  if (Big(pnl.netIncome).abs().gt(0.001)) {
    equityAccounts.push({
      code: 'NET-INCOME',
      name: 'Net Income (Current Period)',
      class: AccountClass.Equity,
      type: 'Retained Earnings',
      totalDebit: 0,
      totalCredit: pnl.netIncome,
      balance: pnl.netIncome,
    });
  }

  const sumBalance = (rows: TrialBalanceRow[]) =>
    rows.reduce((sum, r) => sum.plus(r.balance), Big(0)).toNumber();

  const totalCurrentAssets = sumBalance(currentAssets);
  const totalNonCurrentAssets = sumBalance(nonCurrentAssets);
  const totalAssets = Big(totalCurrentAssets).plus(totalNonCurrentAssets).toNumber();

  const totalCurrentLiabilities = sumBalance(currentLiabilities);
  const totalNonCurrentLiabilities = sumBalance(nonCurrentLiabilities);
  const totalLiabilities = Big(totalCurrentLiabilities).plus(totalNonCurrentLiabilities).toNumber();

  const totalEquity = sumBalance(equityAccounts);
  const totalLiabilitiesAndEquity = Big(totalLiabilities).plus(totalEquity).toNumber();

  return {
    asOfDate,
    currentAssets: { label: 'Current Assets', accounts: currentAssets, total: totalCurrentAssets },
    nonCurrentAssets: { label: 'Non-Current Assets', accounts: nonCurrentAssets, total: totalNonCurrentAssets },
    totalAssets,
    currentLiabilities: { label: 'Current Liabilities', accounts: currentLiabilities, total: totalCurrentLiabilities },
    nonCurrentLiabilities: { label: 'Non-Current Liabilities', accounts: nonCurrentLiabilities, total: totalNonCurrentLiabilities },
    totalLiabilities,
    equity: { label: 'Equity', accounts: equityAccounts, total: totalEquity },
    totalLiabilitiesAndEquity,
    isBalanced: Big(totalAssets).minus(totalLiabilitiesAndEquity).abs().lte(0.01),
  };
}
