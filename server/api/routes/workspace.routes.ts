import {Router} from 'express';
import {workspaceController} from '../controllers/workspace.controller';
import {inviteController} from '../controllers/invite.controller';
import {validate} from '../middleware/validation';
import {
  createWorkspaceDto,
  updateWorkspaceDto,
  updateMemberRoleDto
} from '../dtos/workspace.dto';
import {createInviteDto} from '../dtos/invite.dto';
import {requireAuth} from '../middleware/auth';
import {
  loadWorkspace,
  requireWorkspaceRole
} from '../middleware/workspaceAuth';
import {authActionLimiter, authReadLimiter} from '../middleware/rateLimit';
import workRoutes from './work.routes';
import timeEntryRoutes from './timeEntry.routes';
import reportRoutes from './report.routes';

const router = Router();

router.use(requireAuth);

// workspace scoped routes
router.post(
  '/',
  authActionLimiter,
  validate(createWorkspaceDto),
  workspaceController.create
);
router.get('/', authReadLimiter, workspaceController.list);

router.get(
  '/:workspaceId',
  authReadLimiter,
  loadWorkspace,
  workspaceController.get
);
router.put(
  '/:workspaceId',
  authActionLimiter,
  loadWorkspace,
  requireWorkspaceRole('admin'),
  validate(updateWorkspaceDto),
  workspaceController.update
);
router.delete(
  '/:workspaceId',
  authActionLimiter,
  loadWorkspace,
  requireWorkspaceRole('owner'),
  workspaceController.remove
);

// members
router.get(
  '/:workspaceId/members',
  authReadLimiter,
  loadWorkspace,
  workspaceController.listMembers
);
router.put(
  '/:workspaceId/members/:memberId',
  authActionLimiter,
  loadWorkspace,
  requireWorkspaceRole('owner'),
  validate(updateMemberRoleDto),
  workspaceController.updateMemberRole
);
router.delete(
  '/:workspaceId/members/:memberId',
  authActionLimiter,
  loadWorkspace,
  requireWorkspaceRole('admin'),
  workspaceController.removeMember
);

// invites
router.get(
  '/:workspaceId/invites',
  authReadLimiter,
  loadWorkspace,
  requireWorkspaceRole('admin'),
  inviteController.list
);
router.post(
  '/:workspaceId/invites',
  authActionLimiter,
  loadWorkspace,
  requireWorkspaceRole('admin'),
  validate(createInviteDto),
  inviteController.create
);
router.delete(
  '/:workspaceId/invites/:inviteId',
  authActionLimiter,
  loadWorkspace,
  requireWorkspaceRole('admin'),
  inviteController.revoke
);

// clients, projects, tasks, tags, time entries (all workspace members)
router.use('/:workspaceId', loadWorkspace, workRoutes, timeEntryRoutes, reportRoutes);

export default router;
