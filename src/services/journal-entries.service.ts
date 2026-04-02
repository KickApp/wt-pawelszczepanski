import { randomUUID } from 'crypto';
import { db } from '../db/connection';
import { JournalEntry } from '../types';
import { AppError } from '../middleware/error-handler';

interface JournalEntryLine {
  accountId: string;
  debitAmount?: number;
  creditAmount?: number;
}

interface CreateJournalEntryInput {
  date: string;
  description?: string;
  counterparty?: string;
  lines: JournalEntryLine[];
}

async function validateAccounts(lines: JournalEntryLine[]): Promise<void> {
  const accountIds = [...new Set(lines.map((l) => l.accountId))];
  const existing = await db('accounts').whereIn('id', accountIds).select('id');
  const existingIds = new Set(existing.map((a) => a.id));
  const missing = accountIds.filter((id) => !existingIds.has(id));
  if (missing.length > 0) {
    throw new AppError(400, `Account(s) not found: ${missing.join(', ')}`);
  }
}

export async function createJournalEntry(input: CreateJournalEntryInput): Promise<JournalEntry[]> {
  await validateAccounts(input.lines);

  const referenceNumber = `JE-${randomUUID().slice(0, 8).toUpperCase()}`;

  return db.transaction(async (trx) => {
    const rows = input.lines.map((line) => ({
      date: input.date,
      account_id: line.accountId,
      description: input.description || null,
      debit_amount: line.debitAmount || null,
      credit_amount: line.creditAmount || null,
      reference_number: referenceNumber,
      counterparty: input.counterparty || null,
    }));

    return trx('journal_entries').insert(rows).returning('*');
  });
}

export async function listJournalEntries(options: {
  startDate?: string;
  endDate?: string;
  page: number;
  limit: number;
}): Promise<{ entries: JournalEntry[]; total: number }> {
  let query = db('journal_entries')
    .join('accounts', 'journal_entries.account_id', 'accounts.id')
    .select(
      'journal_entries.*',
      'accounts.code as account_code',
      'accounts.name as account_name',
    );

  if (options.startDate) query = query.where('date', '>=', options.startDate);
  if (options.endDate) query = query.where('date', '<=', options.endDate);

  const countResult = await query.clone().clearSelect().count('journal_entries.id as count').first();
  const total = parseInt(String(countResult?.count || '0'), 10);

  const entries = await query
    .orderBy('date', 'asc')
    .orderBy('reference_number')
    .offset((options.page - 1) * options.limit)
    .limit(options.limit);

  return { entries, total };
}

export async function getJournalEntryByRef(referenceNumber: string): Promise<JournalEntry[]> {
  return db('journal_entries')
    .join('accounts', 'journal_entries.account_id', 'accounts.id')
    .select(
      'journal_entries.*',
      'accounts.code as account_code',
      'accounts.name as account_name',
    )
    .where('reference_number', referenceNumber)
    .orderBy('debit_amount', 'desc');
}

export async function updateJournalEntry(
  referenceNumber: string,
  input: CreateJournalEntryInput,
): Promise<JournalEntry[]> {
  await validateAccounts(input.lines);

  return db.transaction(async (trx) => {
    const existing = await trx('journal_entries').where('reference_number', referenceNumber);
    if (existing.length === 0) {
      throw new AppError(404, `Journal entry ${referenceNumber} not found`);
    }

    await trx('journal_entries').where('reference_number', referenceNumber).delete();

    const rows = input.lines.map((line) => ({
      date: input.date,
      account_id: line.accountId,
      description: input.description || null,
      debit_amount: line.debitAmount || null,
      credit_amount: line.creditAmount || null,
      reference_number: referenceNumber,
      counterparty: input.counterparty || null,
    }));

    return trx('journal_entries').insert(rows).returning('*');
  });
}

export async function deleteJournalEntry(referenceNumber: string): Promise<number> {
  const deleted = await db('journal_entries').where('reference_number', referenceNumber).delete();
  if (deleted === 0) {
    throw new AppError(404, `Journal entry ${referenceNumber} not found`);
  }
  return deleted;
}
