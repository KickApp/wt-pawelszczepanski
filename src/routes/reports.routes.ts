import { Router } from 'express';
import { validate } from '../middleware/validate';
import { trialBalanceSchema, pnlSchema, balanceSheetSchema } from '../validators/report.validator';
import * as controller from '../controllers/reports.controller';

const router = Router();

router.get('/trial-balance', validate(trialBalanceSchema), controller.trialBalance);
router.get('/profit-and-loss', validate(pnlSchema), controller.profitAndLoss);
router.get('/balance-sheet', validate(balanceSheetSchema), controller.balanceSheet);

export default router;
