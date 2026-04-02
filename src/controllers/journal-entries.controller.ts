import { Request, Response, NextFunction } from 'express';
import { JournalEntry } from '../types';
import * as jeService from '../services/journal-entries.service';

// Knex returns snake_case DB columns; the JournalEntry type reflects DB shape.
// We also get account_code/account_name from JOINs (not in the type).
function toCamelCase(row: JournalEntry & { account_code?: string; account_name?: string }) {
  return {
    id: row.id,
    date: row.date,
    accountId: row.account_id,
    accountCode: (row as any).account_code ?? null,
    accountName: (row as any).account_name ?? null,
    description: row.description,
    debitAmount: row.debit_amount ? parseFloat(row.debit_amount) : null,
    creditAmount: row.credit_amount ? parseFloat(row.credit_amount) : null,
    referenceNumber: row.reference_number,
    counterparty: row.counterparty,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const entries = await jeService.createJournalEntry(req.body);
    res.status(201).json({ data: entries.map(toCamelCase) });
  } catch (err) {
    next(err);
  }
}

export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { startDate, endDate, page = 1, limit = 50 } = req.query;
    const result = await jeService.listJournalEntries({
      startDate: startDate as string | undefined,
      endDate: endDate as string | undefined,
      page: Number(page),
      limit: Number(limit),
    });
    res.json({ data: result.entries.map(toCamelCase), meta: { total: result.total, page: Number(page), limit: Number(limit) } });
  } catch (err) {
    next(err);
  }
}

export async function getByRef(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const ref = req.params.ref as string;
    const entries = await jeService.getJournalEntryByRef(ref);
    if (entries.length === 0) {
      res.status(404).json({ error: 'Journal entry not found' });
      return;
    }
    res.json({ data: entries.map(toCamelCase) });
  } catch (err) {
    next(err);
  }
}

export async function update(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const entries = await jeService.updateJournalEntry(req.params.ref as string, req.body);
    res.json({ data: entries.map(toCamelCase) });
  } catch (err) {
    next(err);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await jeService.deleteJournalEntry(req.params.ref as string);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
