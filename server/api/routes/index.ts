import Router from 'express';
import authRoutes from './auth.routes';
import workspaceRoutes from './workspace.routes';
import inviteRoutes from './invite.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/workspaces', workspaceRoutes);
router.use('/invites', inviteRoutes);

export default router;
