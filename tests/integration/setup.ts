// Set test DB env vars BEFORE any app code imports
process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '5433';
process.env.DB_NAME = 'accounting_test';
process.env.DB_USER = 'app';
process.env.DB_PASSWORD = 'testpassword';

import { beforeAll, afterEach, afterAll } from 'vitest';
import { db } from '../../src/db/connection';
import { createAccount } from '../../src/services/accounts.service';
import { createJournalEntry } from '../../src/services/journal-entries.service';
import { AccountClass } from '../../src/types';

export const testAccounts: Record<string, string> = {};

beforeAll(async () => {
  await db.migrate.latest({ directory: './src/db/migrations' });
  await db('journal_entries').del();
  await db('accounts').del();

  const accounts = [
    { code: '10100', name: 'Test Bank Account', class: AccountClass.Assets, type: 'Bank Account' },
    { code: '10200', name: 'Test Payment Processor', class: AccountClass.Assets, type: 'Payment Processor' },
    { code: '15000', name: 'Test Equipment', class: AccountClass.Assets, type: 'Fixed Assets' },
    { code: '16000', name: 'Test Investments', class: AccountClass.Assets, type: 'Investments' },
    { code: '21000', name: 'Test Credit Card', class: AccountClass.Liabilities, type: 'Credit Card' },
    { code: '21500', name: 'Test Accounts Payable', class: AccountClass.Liabilities, type: 'Accounts Payable' },
    { code: '25000', name: 'Test Long-Term Loan', class: AccountClass.Liabilities, type: 'Long-Term Loans' },
    { code: '31000', name: 'Test Owner Equity', class: AccountClass.Equity, type: "Owner's Equity" },
    { code: '40000', name: 'Test Revenue', class: AccountClass.Income, type: 'Revenue' },
    { code: '50000', name: 'Test COGS', class: AccountClass.Expenses, type: 'Cost of Goods Sold' },
    { code: '60000', name: 'Test Rent Expense', class: AccountClass.Expenses, type: 'Operating Expenses' },
    { code: '80000', name: 'Test Depreciation', class: AccountClass.Expenses, type: 'Other Expenses' },
  ];

  for (const acct of accounts) {
    const created = await createAccount(acct);
    testAccounts[acct.code] = created.id;
  }
});

afterEach(async () => {
  await db('journal_entries').del();
});

afterAll(async () => {
  await db('journal_entries').del();
  await db('accounts').del();
  await db.destroy();
});

export async function createJE(
  date: string,
  description: string,
  lines: Array<{ accountId: string; debit?: number; credit?: number }>,
) {
  return createJournalEntry({
    date,
    description,
    lines: lines.map((l) => ({
      accountId: l.accountId,
      debitAmount: l.debit,
      creditAmount: l.credit,
    })),
  });
}
