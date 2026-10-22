import Router from 'express';
import authRoutes from './auth.routes';
import workspaceRoutes from './workspace.routes';
import inviteRoutes from './invite.routes';
import timeRoutes from './time.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/workspaces', workspaceRoutes);
router.use('/invites', inviteRoutes);
router.use('/time', timeRoutes);

export default router;
