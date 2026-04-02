---
name: sheets-sync
description: Reference for Google Sheets API patterns used in this project. Use when implementing or debugging Sheets sync.
---

## Google Sheets API Reference

Auth helper at `src/services/google-auth.ts` provides `getSheetsClient()` and `getDriveClient()`.

### Create a spreadsheet
```ts
const sheets = getSheetsClient();
const res = await sheets.spreadsheets.create({
  requestBody: {
    properties: { title: 'Report Title' },
    sheets: [{ properties: { title: 'Sheet1' } }],
  },
});
const spreadsheetId = res.data.spreadsheetId;
```

### Bulk write data
```ts
await sheets.spreadsheets.values.batchUpdate({
  spreadsheetId,
  requestBody: {
    valueInputOption: 'USER_ENTERED',
    data: [
      { range: 'Sheet1!A1:D1', values: [['Col1', 'Col2', 'Col3', 'Col4']] },
      { range: 'Sheet1!A2', values: rows },
    ],
  },
});
```

### Format (bold headers, freeze, auto-resize)
```ts
await sheets.spreadsheets.batchUpdate({
  spreadsheetId,
  requestBody: {
    requests: [
      { repeatCell: { range: { sheetId: 0, startRowIndex: 0, endRowIndex: 1 },
          cell: { userEnteredFormat: { textFormat: { bold: true } } },
          fields: 'userEnteredFormat.textFormat.bold' } },
      { updateSheetProperties: { properties: { sheetId: 0,
          gridProperties: { frozenRowCount: 1 } },
          fields: 'gridProperties.frozenRowCount' } },
      { autoResizeDimensions: { dimensions: { sheetId: 0, dimension: 'COLUMNS',
          startIndex: 0, endIndex: 10 } } },
    ],
  },
});
```

### Share with a user
```ts
const drive = getDriveClient();
await drive.permissions.create({
  fileId: spreadsheetId,
  requestBody: { type: 'user', role: 'writer', emailAddress: 'user@example.com' },
});
```

### Key points
- `USER_ENTERED` parses dates/numbers/formulas; `RAW` stores as literal strings
- Rate limit: 60 req/min/user, max 10 MB per request
- `values.batchUpdate` = write data; `spreadsheets.batchUpdate` = formatting/structure
- Service account creates sheets in its own Drive — must share via Drive API
