import { Request, Response, NextFunction } from 'express';
import * as reportsService from '../services/reports.service';

export async function trialBalance(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { startDate, endDate } = req.query;
    const report = await reportsService.getTrialBalance(startDate as string, endDate as string);
    res.json({ data: report });
  } catch (err) {
    next(err);
  }
}

export async function profitAndLoss(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { startDate, endDate } = req.query;
    const report = await reportsService.getProfitAndLoss(startDate as string, endDate as string);
    res.json({ data: report });
  } catch (err) {
    next(err);
  }
}

export async function balanceSheet(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { asOfDate } = req.query;
    const report = await reportsService.getBalanceSheet(asOfDate as string);
    res.json({ data: report });
  } catch (err) {
    next(err);
  }
}
