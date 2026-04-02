import { Router } from 'express';
import { validate } from '../middleware/validate';
import { createJournalEntrySchema, listJournalEntriesSchema, updateJournalEntrySchema } from '../validators/journal-entry.validator';
import * as controller from '../controllers/journal-entries.controller';

const router = Router();

router.get('/', validate(listJournalEntriesSchema), controller.list);
router.post('/', validate(createJournalEntrySchema), controller.create);
router.get('/:ref', controller.getByRef);
router.put('/:ref', validate(updateJournalEntrySchema), controller.update);
router.delete('/:ref', controller.remove);

export default router;
