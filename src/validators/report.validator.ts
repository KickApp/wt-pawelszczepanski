import { z } from 'zod';

export const createAccountSchema = z.object({
  body: z.object({
    code: z.string().regex(/^\d{5}$/, 'code must be a 5-digit string'),
    name: z.string().min(1, 'name is required').max(255),
    type: z.string().min(1, 'type is required').max(255),
  }),
  query: z.object({}).passthrough(),
  params: z.object({}).passthrough(),
});

export const trialBalanceSchema = z.object({
  body: z.object({}).passthrough(),
  query: z.object({
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'startDate must be YYYY-MM-DD'),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'endDate must be YYYY-MM-DD'),
  }),
  params: z.object({}).passthrough(),
});

export const pnlSchema = trialBalanceSchema;

export const balanceSheetSchema = z.object({
  body: z.object({}).passthrough(),
  query: z.object({
    asOfDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'asOfDate must be YYYY-MM-DD'),
  }),
  params: z.object({}).passthrough(),
});
