import { Router } from 'express';
import { validate } from '../middleware/validate';
import { createAccountSchema } from '../validators/report.validator';
import * as controller from '../controllers/accounts.controller';

const router = Router();

router.get('/', controller.list);
router.post('/', validate(createAccountSchema), controller.create);

export default router;
