import { describe, it, expect } from 'vitest';
import path from 'path';
import { parseExcelFile } from '../../src/utils/excel-parser';

const EXCEL_PATH = path.join(__dirname, '../../Account_Transactions_of_Internet_Money_2025-01-01-2025-12-31.xlsx');

describe('parseExcelFile', () => {
  const parsed = parseExcelFile(EXCEL_PATH);

  it('parses all 26 accounts', () => {
    expect(parsed.accounts.length).toBe(26);
  });

  it('correctly identifies account codes', () => {
    const codes = parsed.accounts.map(a => a.code).sort();
    expect(codes).toContain('10100');
    expect(codes).toContain('40000');
    expect(codes).toContain('90100');
  });

  it('correctly classifies accounts', () => {
    const chase = parsed.accounts.find(a => a.code === '10100');
    expect(chase?.class).toBe('Assets');

    const revenue = parsed.accounts.find(a => a.code === '40000');
    expect(revenue?.class).toBe('Income');

    const amex = parsed.accounts.find(a => a.code === '21000');
    expect(amex?.class).toBe('Liabilities');
  });

  it('deduplicates GL lines (each reference appears once)', () => {
    const refs = parsed.glLines.map(l => l.referenceNumber);
    const uniqueRefs = new Set(refs);
    expect(refs.length).toBe(uniqueRefs.size);
  });

  it('has valid amounts (no zero amounts)', () => {
    for (const line of parsed.glLines) {
      expect(Math.abs(line.amount)).toBeGreaterThan(0);
    }
  });

  it('all GL lines have valid dates in ISO format', () => {
    for (const line of parsed.glLines) {
      expect(line.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it('all GL lines have reference numbers', () => {
    for (const line of parsed.glLines) {
      expect(line.referenceNumber).toBeTruthy();
      expect(line.referenceNumber.startsWith('JE-')).toBe(true);
    }
  });

  it('validates double-entry: for each line, both account and split exist', () => {
    const codes = new Set(parsed.accounts.map(a => a.code));
    for (const line of parsed.glLines) {
      expect(codes.has(line.accountCode)).toBe(true);
      expect(codes.has(line.splitAccountCode)).toBe(true);
    }
  });
});
