import { Request, Response, NextFunction } from 'express';
import * as exportService from '../services/export.service';

export async function exportExcel(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { startDate, endDate } = req.query;
    const buffer = await exportService.exportToExcel(startDate as string, endDate as string);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="general_ledger_${startDate}_${endDate}.xlsx"`);
    res.send(buffer);
  } catch (err) {
    next(err);
  }
}

export async function exportGoogleSheets(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { startDate, endDate } = req.query;
    const { shareWith } = req.body || {};
    const result = await exportService.exportToGoogleSheets(
      startDate as string,
      endDate as string,
      shareWith,
    );
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
}
