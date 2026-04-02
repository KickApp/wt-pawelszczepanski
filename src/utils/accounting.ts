import Big from 'big.js';
import { AccountClass } from '../types';

export function classFromCode(code: string): AccountClass {
  const prefix = parseInt(code[0], 10);
  switch (prefix) {
    case 1: return AccountClass.Assets;
    case 2: return AccountClass.Liabilities;
    case 3: return AccountClass.Equity;
    case 4: return AccountClass.Income;
    case 5:
    case 6:
    case 7:
    case 8:
    case 9: return AccountClass.Expenses;
    default: throw new Error(`Unknown account code prefix: ${code}`);
  }
}

export function isCreditNormal(accountClass: AccountClass): boolean {
  return [AccountClass.Liabilities, AccountClass.Equity, AccountClass.Income].includes(accountClass);
}

export function computeBalance(totalDebit: number, totalCredit: number, accountClass: AccountClass): number {
  if (isCreditNormal(accountClass)) {
    return Big(totalCredit).minus(totalDebit).toNumber();
  }
  return Big(totalDebit).minus(totalCredit).toNumber();
}

export function typeFromAccountHeader(code: string, name: string): string {
  // Extract the type portion from account headers like "10100 - Bank Account - Chase Business Checking - 0205"
  // or simple ones like "40000 - Revenue"
  const parts = name.split(' - ').map(p => p.trim());
  if (parts.length >= 2) {
    return parts[0]; // First part after code is the type
  }
  return name;
}

// Classify account types into Balance Sheet sections
const CURRENT_ASSET_TYPES = ['Bank Account', 'Payment Processor'];
const NON_CURRENT_ASSET_TYPES = ['Fixed Assets', 'Investments', 'Intangible Assets'];
const CURRENT_LIABILITY_TYPES = ['Credit Card', 'Accounts Payable', 'Short-Term Loans'];
const NON_CURRENT_LIABILITY_TYPES = ['Long-Term Loans', 'Notes Payable'];

export function getBalanceSheetSection(accountClass: AccountClass, accountType: string): string {
  if (accountClass === AccountClass.Assets) {
    if (NON_CURRENT_ASSET_TYPES.includes(accountType)) return 'Non-Current Assets';
    return 'Current Assets';
  }
  if (accountClass === AccountClass.Liabilities) {
    if (NON_CURRENT_LIABILITY_TYPES.includes(accountType)) return 'Non-Current Liabilities';
    return 'Current Liabilities';
  }
  return 'Equity';
}

// P&L section classification by code range
export function getPnLSection(code: string): 'income' | 'cogs' | 'operatingExpenses' | 'otherIncomeExpenses' {
  const num = parseInt(code, 10);
  if (num >= 40000 && num < 50000) return 'income';
  if (num >= 50000 && num < 60000) return 'cogs';
  if (num >= 60000 && num < 80000) return 'operatingExpenses';
  return 'otherIncomeExpenses'; // 80000-99999
}
