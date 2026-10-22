import {Router} from 'express';
import {timeEntryController} from '../controllers/timeEntry.controller';
import {requireAuth} from '../middleware/auth';
import {authReadLimiter} from '../middleware/rateLimit';

const router = Router();

router.use(requireAuth);

// The running timer is global to the signed-in user, regardless of workspace.
router.get('/running', authReadLimiter, timeEntryController.globalRunning);

export default router;
