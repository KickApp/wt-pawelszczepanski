import * as XLSX from 'xlsx';
import { classFromCode, typeFromAccountHeader } from './accounting';

export interface ParsedAccount {
  code: string;
  name: string;
  class: string;
  type: string;
}

export interface ParsedGLLine {
  date: string;
  referenceNumber: string;
  description: string;
  counterparty: string;
  accountCode: string;
  splitAccountCode: string;
  amount: number; // positive = debit to this account, negative = credit
}

export interface ParsedData {
  accounts: ParsedAccount[];
  glLines: ParsedGLLine[];
}

function parseAmount(raw: string): number {
  if (!raw || raw.trim() === '' || raw.trim() === '-') return 0;
  // Remove spaces, currency symbols, and handle parentheses for negatives
  let cleaned = raw.trim().replace(/\$/g, '').replace(/\s/g, '');
  const isNegative = cleaned.startsWith('(') && cleaned.endsWith(')');
  if (isNegative) {
    cleaned = cleaned.slice(1, -1);
  }
  cleaned = cleaned.replace(/,/g, '');
  const num = parseFloat(cleaned);
  if (isNaN(num)) return 0;
  return isNegative ? -num : num;
}

function extractCodeFromSplit(split: string): string {
  // "10100 - Bank Account - Chase Business Checking - 0205" -> "10100"
  const match = split.match(/^(\d{5})/);
  return match ? match[1] : '';
}

export function parseExcelFile(filePath: string): ParsedData {
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows: (string | undefined)[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false });

  const accounts: Map<string, ParsedAccount> = new Map();
  const glLines: ParsedGLLine[] = [];
  const seenReferences = new Set<string>();

  let currentAccountCode = '';
  let currentAccountName = '';

  for (const row of rows) {
    if (!row || row.length === 0) continue;

    // Column B (index 1) contains the main data
    const colB = (row[1] || '').trim();

    // Check if this is an account header row: "10100 - Bank Account - ..."
    const accountMatch = colB.match(/^(\d{5})\s*-\s*(.+)/);
    if (accountMatch && !row[2] && !row[3]) {
      currentAccountCode = accountMatch[1];
      currentAccountName = accountMatch[2].trim();

      if (!accounts.has(currentAccountCode)) {
        const type = typeFromAccountHeader(currentAccountCode, currentAccountName);
        accounts.set(currentAccountCode, {
          code: currentAccountCode,
          name: currentAccountName,
          class: classFromCode(currentAccountCode),
          type,
        });
      }
      continue;
    }

    // Skip header, beginning/ending balance, empty rows
    if (!colB || colB === 'Date' || colB === 'Beginning Balance' || colB === 'Ending Balance') continue;

    // Check if this is a transaction row (colB should be a date)
    const dateMatch = colB.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!dateMatch || !currentAccountCode) continue;

    const date = `${dateMatch[3]}-${dateMatch[1]}-${dateMatch[2]}`; // ISO format
    const reference = (row[3] || '').trim();
    const description = (row[4] || '').trim();
    const counterparty = (row[5] || '').trim();
    const splitRaw = (row[6] || '').trim();
    const amountRaw = (row[7] || '').trim();

    if (!reference) continue;

    const splitCode = extractCodeFromSplit(splitRaw);
    const amount = parseAmount(amountRaw);

    // Also register the split account if not yet seen
    if (splitCode && !accounts.has(splitCode)) {
      const splitName = splitRaw.replace(/^\d{5}\s*-\s*/, '').trim();
      const type = typeFromAccountHeader(splitCode, splitName);
      accounts.set(splitCode, {
        code: splitCode,
        name: splitName,
        class: classFromCode(splitCode),
        type,
      });
    }

    // Deduplicate: each reference appears under two accounts.
    // Only process the first occurrence.
    if (seenReferences.has(reference)) continue;
    seenReferences.add(reference);

    glLines.push({
      date,
      referenceNumber: reference,
      description,
      counterparty,
      accountCode: currentAccountCode,
      splitAccountCode: splitCode,
      amount,
    });
  }

  return {
    accounts: Array.from(accounts.values()),
    glLines,
  };
}
