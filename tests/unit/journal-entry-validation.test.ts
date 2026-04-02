import { describe, it, expect } from 'vitest';
import { createJournalEntrySchema } from '../../src/validators/journal-entry.validator';

const uuid1 = '00000000-0000-0000-0000-000000000001';
const uuid2 = '00000000-0000-0000-0000-000000000002';

function validate(body: unknown) {
  return createJournalEntrySchema.safeParse({ body, query: {}, params: {} });
}

function validEntry(overrides?: Partial<{ date: string; lines: unknown[] }>) {
  return {
    date: '2025-01-15',
    description: 'Test entry',
    lines: [
      { accountId: uuid1, debitAmount: 500 },
      { accountId: uuid2, creditAmount: 500 },
    ],
    ...overrides,
  };
}

describe('journal entry validation', () => {
  describe('valid entries', () => {
    it('accepts a balanced 2-line entry', () => {
      const result = validate(validEntry());
      expect(result.success).toBe(true);
    });

    it('accepts a multi-line entry that balances', () => {
      const result = validate(validEntry({
        lines: [
          { accountId: uuid1, debitAmount: 300 },
          { accountId: uuid2, debitAmount: 200 },
          { accountId: '00000000-0000-0000-0000-000000000003', creditAmount: 500 },
        ],
      }));
      expect(result.success).toBe(true);
    });

    it('accepts entry without optional fields', () => {
      const result = validate({ date: '2025-06-01', lines: validEntry().lines });
      expect(result.success).toBe(true);
    });
  });

  describe('exactly one side per line', () => {
    it('rejects line with both debit and credit', () => {
      const result = validate(validEntry({
        lines: [
          { accountId: uuid1, debitAmount: 500, creditAmount: 500 },
          { accountId: uuid2, creditAmount: 500 },
        ],
      }));
      expect(result.success).toBe(false);
    });

    it('rejects line with neither debit nor credit', () => {
      const result = validate(validEntry({
        lines: [
          { accountId: uuid1 },
          { accountId: uuid2, creditAmount: 500 },
        ],
      }));
      expect(result.success).toBe(false);
    });
  });

  describe('double-entry balance', () => {
    it('rejects when debits != credits', () => {
      const result = validate(validEntry({
        lines: [
          { accountId: uuid1, debitAmount: 500 },
          { accountId: uuid2, creditAmount: 300 },
        ],
      }));
      expect(result.success).toBe(false);
      if (!result.success) {
        const messages = result.error.issues.map((i) => i.message);
        expect(messages.some((m) => m.includes('Double-entry violation'))).toBe(true);
      }
    });

    it('rejects all-debit entry', () => {
      const result = validate(validEntry({
        lines: [
          { accountId: uuid1, debitAmount: 500 },
          { accountId: uuid2, debitAmount: 500 },
        ],
      }));
      expect(result.success).toBe(false);
    });

    it('rejects all-credit entry', () => {
      const result = validate(validEntry({
        lines: [
          { accountId: uuid1, creditAmount: 500 },
          { accountId: uuid2, creditAmount: 500 },
        ],
      }));
      expect(result.success).toBe(false);
    });

    it('accepts entry balanced to the penny', () => {
      const result = validate(validEntry({
        lines: [
          { accountId: uuid1, debitAmount: 33.33 },
          { accountId: uuid2, creditAmount: 33.33 },
        ],
      }));
      expect(result.success).toBe(true);
    });
  });

  describe('no duplicate accountIds', () => {
    it('rejects duplicate accountIds', () => {
      const result = validate(validEntry({
        lines: [
          { accountId: uuid1, debitAmount: 500 },
          { accountId: uuid1, creditAmount: 500 },
        ],
      }));
      expect(result.success).toBe(false);
      if (!result.success) {
        const messages = result.error.issues.map((i) => i.message);
        expect(messages.some((m) => m.includes('Duplicate accountId'))).toBe(true);
      }
    });
  });

  describe('positive amounts', () => {
    it('rejects zero debit', () => {
      const result = validate(validEntry({
        lines: [
          { accountId: uuid1, debitAmount: 0 },
          { accountId: uuid2, creditAmount: 0 },
        ],
      }));
      expect(result.success).toBe(false);
    });

    it('rejects negative debit', () => {
      const result = validate(validEntry({
        lines: [
          { accountId: uuid1, debitAmount: -500 },
          { accountId: uuid2, creditAmount: 500 },
        ],
      }));
      expect(result.success).toBe(false);
    });

    it('rejects negative credit', () => {
      const result = validate(validEntry({
        lines: [
          { accountId: uuid1, debitAmount: 500 },
          { accountId: uuid2, creditAmount: -500 },
        ],
      }));
      expect(result.success).toBe(false);
    });
  });

  describe('minimum lines', () => {
    it('rejects single-line entry', () => {
      const result = validate(validEntry({
        lines: [{ accountId: uuid1, debitAmount: 500 }],
      }));
      expect(result.success).toBe(false);
    });

    it('rejects empty lines', () => {
      const result = validate(validEntry({ lines: [] }));
      expect(result.success).toBe(false);
    });
  });

  describe('date format', () => {
    it('rejects invalid date format', () => {
      const result = validate(validEntry({ date: '01/15/2025' }));
      expect(result.success).toBe(false);
    });

    it('rejects non-date string', () => {
      const result = validate(validEntry({ date: 'not-a-date' }));
      expect(result.success).toBe(false);
    });
  });

  describe('accountId format', () => {
    it('rejects non-uuid accountId', () => {
      const result = validate(validEntry({
        lines: [
          { accountId: 'not-a-uuid', debitAmount: 500 },
          { accountId: uuid2, creditAmount: 500 },
        ],
      }));
      expect(result.success).toBe(false);
    });
  });
});
