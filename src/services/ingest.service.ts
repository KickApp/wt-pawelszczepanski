import Big from 'big.js';
import path from 'path';
import { Knex } from 'knex';
import { db } from '../db/connection';
import { AccountClass } from '../types';
import { parseExcelFile, ParsedData } from '../utils/excel-parser';
import { logger } from '../logger';

export async function getRecordCounts(): Promise<{ accounts: number; journalEntries: number }> {
  const [{ count: accounts }] = await db('accounts').count('* as count');
  const [{ count: journalEntries }] = await db('journal_entries').count('* as count');
  return { accounts: Number(accounts), journalEntries: Number(journalEntries) };
}

async function insertParsedData(trx: Knex.Transaction, parsed: ParsedData): Promise<{ accounts: number; journalEntries: number }> {
  // Upsert accounts
  for (const account of parsed.accounts) {
    await trx('accounts')
      .insert({
        code: account.code,
        name: account.name,
        class: account.class as AccountClass,
        type: account.type,
      })
      .onConflict('code')
      .merge(['name', 'class', 'type']);
  }

  // Build account code -> id map
  const accountRows = await trx('accounts').select('id', 'code');
  const codeToId = new Map<string, string>(accountRows.map((a) => [a.code, a.id]));

  // Insert GL lines: for each parsed line, create 2 entries (debit + credit)
  let entryCount = 0;
  const batchSize = 100;
  const rows: Array<Record<string, unknown>> = [];

  for (const line of parsed.glLines) {
    const accountId = codeToId.get(line.accountCode);
    const splitAccountId = codeToId.get(line.splitAccountCode);

    if (!accountId || !splitAccountId) {
      logger.warn({ line }, 'Skipping line: account not found');
      continue;
    }

    const amount = Big(line.amount);
    const absAmount = amount.abs().toNumber();
    if (amount.abs().lte(0.001)) continue;

    if (amount.gt(0)) {
      rows.push({
        date: line.date,
        account_id: accountId,
        description: line.description,
        debit_amount: absAmount,
        credit_amount: null,
        reference_number: line.referenceNumber,
        counterparty: line.counterparty,
      });
      rows.push({
        date: line.date,
        account_id: splitAccountId,
        description: line.description,
        debit_amount: null,
        credit_amount: absAmount,
        reference_number: line.referenceNumber,
        counterparty: line.counterparty,
      });
    } else {
      rows.push({
        date: line.date,
        account_id: accountId,
        description: line.description,
        debit_amount: null,
        credit_amount: absAmount,
        reference_number: line.referenceNumber,
        counterparty: line.counterparty,
      });
      rows.push({
        date: line.date,
        account_id: splitAccountId,
        description: line.description,
        debit_amount: absAmount,
        credit_amount: null,
        reference_number: line.referenceNumber,
        counterparty: line.counterparty,
      });
    }

    entryCount++;

    if (rows.length >= batchSize) {
      await trx('journal_entries').insert(rows);
      rows.length = 0;
    }
  }

  if (rows.length > 0) {
    await trx('journal_entries').insert(rows);
  }

  logger.info({ accounts: parsed.accounts.length, journalEntries: entryCount }, 'Ingestion complete');
  return { accounts: parsed.accounts.length, journalEntries: entryCount };
}

export async function truncateAndLoad(filePath?: string): Promise<{ accounts: number; journalEntries: number }> {
  const resolvedPath = filePath || path.join(process.cwd(), 'data', 'Account_Transactions_of_Internet_Money_2025-01-01-2025-12-31.xlsx');

  logger.info({ filePath: resolvedPath }, 'Truncating all data and reloading from Excel');

  const parsed: ParsedData = parseExcelFile(resolvedPath);

  return db.transaction(async (trx) => {
    await trx.raw('TRUNCATE journal_entries, accounts CASCADE');
    return insertParsedData(trx, parsed);
  });
}

export async function ingestExcelData(filePath?: string): Promise<{ accounts: number; journalEntries: number }> {
  const resolvedPath = filePath || path.join(process.cwd(), 'data', 'Account_Transactions_of_Internet_Money_2025-01-01-2025-12-31.xlsx');

  logger.info({ filePath: resolvedPath }, 'Starting Excel ingestion');

  const parsed: ParsedData = parseExcelFile(resolvedPath);

  logger.info({ accounts: parsed.accounts.length, glLines: parsed.glLines.length }, 'Parsed Excel data');

  return db.transaction(async (trx) => {
    return insertParsedData(trx, parsed);
  });
}
