export enum AccountClass {
  Assets = 'Assets',
  Liabilities = 'Liabilities',
  Equity = 'Equity',
  Income = 'Income',
  Expenses = 'Expenses',
}

export interface Account {
  id: string;
  code: string;
  name: string;
  class: AccountClass;
  type: string;
  created_at: Date;
  updated_at: Date;
}

export interface JournalEntry {
  id: string;
  date: string;
  account_id: string;
  description: string | null;
  debit_amount: string | null;
  credit_amount: string | null;
  reference_number: string;
  counterparty: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface TrialBalanceRow {
  code: string;
  name: string;
  class: AccountClass;
  type: string;
  totalDebit: number;
  totalCredit: number;
  balance: number;
}

export interface TrialBalanceReport {
  startDate: string;
  endDate: string;
  rows: TrialBalanceRow[];
  grandTotalDebit: number;
  grandTotalCredit: number;
  isBalanced: boolean;
}

export interface PnLSection {
  label: string;
  accounts: TrialBalanceRow[];
  total: number;
}

export interface PnLReport {
  startDate: string;
  endDate: string;
  income: PnLSection;
  costOfGoodsSold: PnLSection;
  grossProfit: number;
  operatingExpenses: PnLSection;
  netOperatingIncome: number;
  otherIncomeExpenses: PnLSection;
  netIncome: number;
}

export interface BalanceSheetSection {
  label: string;
  accounts: TrialBalanceRow[];
  total: number;
}

export interface BalanceSheetReport {
  asOfDate: string;
  currentAssets: BalanceSheetSection;
  nonCurrentAssets: BalanceSheetSection;
  totalAssets: number;
  currentLiabilities: BalanceSheetSection;
  nonCurrentLiabilities: BalanceSheetSection;
  totalLiabilities: number;
  equity: BalanceSheetSection;
  totalLiabilitiesAndEquity: number;
  isBalanced: boolean;
}
