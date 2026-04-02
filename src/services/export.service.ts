import Big from 'big.js';
import * as XLSX from 'xlsx';
import { db } from '../db/connection';
import { getSheetsClient, getDriveClient } from './google-auth';

interface GLRow {
  date: string;
  account_code: string;
  account_name: string;
  description: string | null;
  debit_amount: string | null;
  credit_amount: string | null;
  reference_number: string;
  counterparty: string | null;
  split_code: string | null;
  split_name: string | null;
}

async function fetchGLData(startDate: string, endDate: string): Promise<GLRow[]> {
  return db('journal_entries as je')
    .join('accounts as a', 'je.account_id', 'a.id')
    .whereBetween('je.date', [startDate, endDate])
    .orderBy(['a.code', 'je.date', 'je.reference_number'])
    .select(
      'je.date',
      'a.code as account_code',
      'a.name as account_name',
      'je.description',
      db.raw('je.debit_amount::numeric as debit_amount'),
      db.raw('je.credit_amount::numeric as credit_amount'),
      'je.reference_number',
      'je.counterparty',
    );
}

// Find the split (other side) account for a journal entry
async function buildSplitMap(startDate: string, endDate: string): Promise<Map<string, { code: string; name: string }>> {
  // For each (reference_number, account_code), find the other account in the same reference
  const rows = await db('journal_entries as je')
    .join('accounts as a', 'je.account_id', 'a.id')
    .whereBetween('je.date', [startDate, endDate])
    .select('je.reference_number', 'a.code', 'a.name');

  const refToAccounts = new Map<string, Array<{ code: string; name: string }>>();
  for (const r of rows) {
    const list = refToAccounts.get(r.reference_number) || [];
    list.push({ code: r.code, name: r.name });
    refToAccounts.set(r.reference_number, list);
  }

  // Key: "ref|accountCode" -> the other account
  const splitMap = new Map<string, { code: string; name: string }>();
  for (const [ref, accounts] of refToAccounts) {
    for (const acc of accounts) {
      const other = accounts.find((a) => a.code !== acc.code);
      if (other) {
        splitMap.set(`${ref}|${acc.code}`, other);
      }
    }
  }
  return splitMap;
}

function formatAmount(value: Big): string {
  const abs = value.abs();
  const formatted = Number(abs).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (value.lt(0)) return ` (${formatted})`;
  return ` ${formatted} `;
}

function formatDateUS(isoDate: string | Date): string {
  if (isoDate instanceof Date) {
    const y = isoDate.getFullYear();
    const m = String(isoDate.getMonth() + 1).padStart(2, '0');
    const d = String(isoDate.getDate()).padStart(2, '0');
    return `${m}/${d}/${y}`;
  }
  const [y, m, d] = isoDate.split('-');
  return `${m}/${d}/${y}`;
}

function formatDateRange(startDate: string, endDate: string): string {
  const fmt = (iso: string) => {
    const d = new Date(iso + 'T00:00:00');
    const months = ['January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'];
    const day = d.getDate();
    const suffix = day === 1 ? 'st' : day === 2 ? 'nd' : day === 3 ? 'rd' : 'th';
    return `${months[d.getMonth()]} ${day}${suffix} ${d.getFullYear()}`;
  };
  return `${fmt(startDate)} - ${fmt(endDate)}`;
}

type CellValue = string | null;

interface SheetData {
  rows: CellValue[][];
  merges: XLSX.Range[];
}

function buildSheetRows(
  glData: GLRow[],
  splitMap: Map<string, { code: string; name: string }>,
  startDate: string,
  endDate: string,
): SheetData {
  const rows: CellValue[][] = [];
  const merges: XLSX.Range[] = [];

  // Title section — centered across columns A-H
  rows.push([]);                          // row 0: empty
  rows.push(["Pawel's Ledger"]);          // row 1
  rows.push(['General Ledger']);           // row 2
  rows.push([formatDateRange(startDate, endDate)]); // row 3
  rows.push([]);                          // row 4: empty
  // Merge title rows across A-H
  merges.push({ s: { r: 1, c: 0 }, e: { r: 1, c: 7 } });
  merges.push({ s: { r: 2, c: 0 }, e: { r: 2, c: 7 } });
  merges.push({ s: { r: 3, c: 0 }, e: { r: 3, c: 7 } });

  // Column headers — row 5
  rows.push(['Date', 'Source', 'Reference', 'Description', 'Counterparty', 'Split', 'Amount', 'Balance']);

  // Group by account
  const accountGroups = new Map<string, GLRow[]>();
  const accountNames = new Map<string, string>();
  for (const row of glData) {
    const list = accountGroups.get(row.account_code) || [];
    list.push(row);
    accountGroups.set(row.account_code, list);
    accountNames.set(row.account_code, row.account_name);
  }

  const sortedCodes = [...accountGroups.keys()].sort();

  for (const code of sortedCodes) {
    const entries = accountGroups.get(code)!;
    const fullName = accountNames.get(code)!;

    // Account header row
    rows.push([`${code} - ${fullName}`]);
    // Beginning Balance
    rows.push(['Beginning Balance', '', '', '', '', '', null, ' -   ']);

    let balance = Big(0);

    for (const entry of entries) {
      const debit = entry.debit_amount ? Big(entry.debit_amount) : Big(0);
      const credit = entry.credit_amount ? Big(entry.credit_amount) : Big(0);
      const amount = debit.gt(0) ? debit : credit.times(-1);
      balance = balance.plus(amount);

      const split = splitMap.get(`${entry.reference_number}|${code}`);
      const splitLabel = split ? `${split.code} - ${split.name}` : '';

      rows.push([
        formatDateUS(entry.date),
        'Transactions',
        entry.reference_number,
        entry.description || '',
        entry.counterparty || '',
        splitLabel,
        formatAmount(amount),
        formatAmount(balance),
      ]);
    }

    // Ending Balance
    rows.push(['Ending Balance', '', '', '', '', '', null, formatAmount(balance)]);
  }

  return { rows, merges };
}

export async function exportToExcel(startDate: string, endDate: string): Promise<Buffer> {
  const [glData, splitMap] = await Promise.all([
    fetchGLData(startDate, endDate),
    buildSplitMap(startDate, endDate),
  ]);

  const { rows, merges } = buildSheetRows(glData, splitMap, startDate, endDate);

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(rows);

  ws['!merges'] = merges;
  ws['!cols'] = [
    { wch: 14 }, // A (Date)
    { wch: 14 }, // B (Source)
    { wch: 16 }, // C (Reference)
    { wch: 30 }, // D (Description)
    { wch: 20 }, // E (Counterparty)
    { wch: 45 }, // F (Split)
    { wch: 16 }, // G (Amount)
    { wch: 16 }, // H (Balance)
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'General Ledger');
  return Buffer.from(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }));
}

export async function exportToGoogleSheets(
  startDate: string,
  endDate: string,
  shareWith?: string,
): Promise<{ spreadsheetId: string; spreadsheetUrl: string }> {
  const [glData, splitMap] = await Promise.all([
    fetchGLData(startDate, endDate),
    buildSplitMap(startDate, endDate),
  ]);

  const { rows } = buildSheetRows(glData, splitMap, startDate, endDate);

  const sheets = getSheetsClient();
  const drive = getDriveClient();

  const createRes = await sheets.spreadsheets.create({
    requestBody: {
      properties: { title: `Pawel's Ledger - General Ledger ${startDate} to ${endDate}` },
      sheets: [{ properties: { title: 'General Ledger' } }],
    },
  });

  const spreadsheetId = createRes.data.spreadsheetId!;
  const spreadsheetUrl = createRes.data.spreadsheetUrl!;

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: 'General Ledger!A1',
    valueInputOption: 'RAW',
    requestBody: { values: rows },
  });

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        {
          repeatCell: {
            range: { sheetId: 0, startRowIndex: 5, endRowIndex: 6 },
            cell: {
              userEnteredFormat: {
                textFormat: { bold: true },
                backgroundColor: { red: 0.93, green: 0.93, blue: 0.93 },
              },
            },
            fields: 'userEnteredFormat(textFormat,backgroundColor)',
          },
        },
        {
          updateSheetProperties: {
            properties: { sheetId: 0, gridProperties: { frozenRowCount: 6 } },
            fields: 'gridProperties.frozenRowCount',
          },
        },
        {
          autoResizeDimensions: {
            dimensions: { sheetId: 0, dimension: 'COLUMNS', startIndex: 0, endIndex: 8 },
          },
        },
      ],
    },
  });

  if (shareWith) {
    await drive.permissions.create({
      fileId: spreadsheetId,
      requestBody: { type: 'user', role: 'writer', emailAddress: shareWith },
    });
  }

  return { spreadsheetId, spreadsheetUrl };
}
