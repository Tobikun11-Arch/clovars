import {Router} from 'express';
import {inviteController} from '../controllers/invite.controller';
import {validate} from '../middleware/validation';
import {acceptInviteDto} from '../dtos/invite.dto';
import {requireAuth} from '../middleware/auth';
import {authActionLimiter, authReadLimiter} from '../middleware/rateLimit';

const router = Router();

router.use(requireAuth);

router.get('/mine', authReadLimiter, inviteController.mine);
router.get('/code/:code', authReadLimiter, inviteController.preview);
router.post(
  '/accept',
  authActionLimiter,
  validate(acceptInviteDto),
  inviteController.accept
);

export default router;
