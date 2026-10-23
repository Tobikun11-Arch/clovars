import {Router} from 'express';
import {reportController} from '../controllers/report.controller';
import {authReadLimiter} from '../middleware/rateLimit';

// mergeParams lets these routes read :workspaceId from the parent router
const router = Router({mergeParams: true});

router.get('/reports', authReadLimiter, reportController.summary);
router.get('/reports/export', authReadLimiter, reportController.exportCsv);
router.get('/reports/export/detailed', authReadLimiter, reportController.exportDetailedCsv);

export default router;