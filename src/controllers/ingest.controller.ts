import { Request, Response, NextFunction } from 'express';
import { ingestExcelData } from '../services/ingest.service';

export async function ingest(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await ingestExcelData();
    res.json({ data: result, message: 'Ingestion complete' });
  } catch (err) {
    next(err);
  }
}
