import {Router} from 'express';
import {timeEntryController} from '../controllers/timeEntry.controller';
import {validate} from '../middleware/validation';
import {
  createTimeEntryDto,
  updateTimeEntryDto,
  startTimerDto,
  stopTimerDto,
  pauseTimerDto,
  resumeTimerDto
} from '../dtos/timeEntry.dto';
import {authActionLimiter, authReadLimiter} from '../middleware/rateLimit';

// mergeParams lets these routes read :workspaceId from the parent router
const router = Router({mergeParams: true});

router.get('/time-entries', authReadLimiter, timeEntryController.list);
router.post(
  '/time-entries',
  authActionLimiter,
  validate(createTimeEntryDto),
  timeEntryController.create
);

router.get(
  '/time-entries/running',
  authReadLimiter,
  timeEntryController.running
);
router.post(
  '/time-entries/start',
  authActionLimiter,
  validate(startTimerDto),
  timeEntryController.start
);
router.post(
  '/time-entries/stop',
  authActionLimiter,
  validate(stopTimerDto),
  timeEntryController.stop
);
router.post(
  '/time-entries/pause',
  authActionLimiter,
  validate(pauseTimerDto),
  timeEntryController.pause
);
router.post(
  '/time-entries/resume',
  authActionLimiter,
  validate(resumeTimerDto),
  timeEntryController.resume
);

router.get('/time-entries/:entryId', authReadLimiter, timeEntryController.get);
router.put(
  '/time-entries/:entryId',
  authActionLimiter,
  validate(updateTimeEntryDto),
  timeEntryController.update
);
router.delete(
  '/time-entries/:entryId',
  authActionLimiter,
  timeEntryController.remove
);

export default router;
