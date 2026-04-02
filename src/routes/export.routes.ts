import { Router } from 'express';
import { validate } from '../middleware/validate';
import { trialBalanceSchema } from '../validators/report.validator';
import * as controller from '../controllers/export.controller';

const router = Router();

// GET /api/export?startDate=&endDate= — download Excel file
router.get('/download', validate(trialBalanceSchema), controller.exportExcel);

// POST /api/export/google?startDate=&endDate= — create Google Sheet
// Body: { shareWith?: "email@example.com" }
router.post('/google', validate(trialBalanceSchema), controller.exportGoogleSheets);

export default router;
