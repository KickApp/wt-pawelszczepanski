import Big from 'big.js';
import { z } from 'zod';

const lineSchema = z.object({
  accountId: z.string().uuid(),
  debitAmount: z.number().positive().optional(),
  creditAmount: z.number().positive().optional(),
}).refine(
  (line) => (line.debitAmount != null) !== (line.creditAmount != null),
  { message: 'Each line must have exactly one of debitAmount or creditAmount' },
);

const journalEntryBody = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  description: z.string().max(500).optional(),
  counterparty: z.string().max(255).optional(),
  lines: z.array(lineSchema).min(2, 'Journal entry must have at least 2 lines'),
}).superRefine((data, ctx) => {
  // Double-entry balance: sum(debits) must equal sum(credits)
  const totalDebit = data.lines.reduce((sum, l) => sum.plus(l.debitAmount || 0), Big(0));
  const totalCredit = data.lines.reduce((sum, l) => sum.plus(l.creditAmount || 0), Big(0));
  if (!totalDebit.eq(totalCredit)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Double-entry violation: total debits (${totalDebit.toFixed(2)}) must equal total credits (${totalCredit.toFixed(2)})`,
      path: ['lines'],
    });
  }

  // No duplicate accountIds within the same entry
  const accountIds = data.lines.map((l) => l.accountId);
  const seen = new Set<string>();
  for (let i = 0; i < accountIds.length; i++) {
    if (seen.has(accountIds[i])) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Duplicate accountId: ${accountIds[i]}`,
        path: ['lines', i, 'accountId'],
      });
    }
    seen.add(accountIds[i]);
  }
});

export const createJournalEntrySchema = z.object({
  body: journalEntryBody,
  query: z.object({}).passthrough(),
  params: z.object({}).passthrough(),
});

export const updateJournalEntrySchema = createJournalEntrySchema;

export const listJournalEntriesSchema = z.object({
  body: z.object({}).passthrough(),
  query: z.object({
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    page: z.coerce.number().int().positive().optional().default(1),
    limit: z.coerce.number().int().positive().max(100).optional().default(50),
  }),
  params: z.object({}).passthrough(),
});
