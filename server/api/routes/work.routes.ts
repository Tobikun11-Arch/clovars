import {Router} from 'express';
import {
  clientController,
  projectController,
  taskController,
  tagController
} from '../controllers/work.controller';
import {validate} from '../middleware/validation';
import {
  createClientDto,
  updateClientDto,
  createProjectDto,
  updateProjectDto,
  createTaskDto,
  updateTaskDto,
  createTagDto,
  updateTagDto
} from '../dtos/work.dto';
import {authActionLimiter, authReadLimiter} from '../middleware/rateLimit';

// mergeParams lets these routes read :workspaceId from the parent router
const router = Router({mergeParams: true});

// clients
router.get('/clients', authReadLimiter, clientController.list);
router.post(
  '/clients',
  authActionLimiter,
  validate(createClientDto),
  clientController.create
);
router.get('/clients/:clientId', authReadLimiter, clientController.get);
router.put(
  '/clients/:clientId',
  authActionLimiter,
  validate(updateClientDto),
  clientController.update
);
router.delete(
  '/clients/:clientId',
  authActionLimiter,
  clientController.remove
);

// projects
router.get('/projects', authReadLimiter, projectController.list);
router.post(
  '/projects',
  authActionLimiter,
  validate(createProjectDto),
  projectController.create
);
router.get('/projects/:projectId', authReadLimiter, projectController.get);
router.put(
  '/projects/:projectId',
  authActionLimiter,
  validate(updateProjectDto),
  projectController.update
);
router.delete(
  '/projects/:projectId',
  authActionLimiter,
  projectController.remove
);

// tasks
router.get('/tasks', authReadLimiter, taskController.list);
router.post(
  '/tasks',
  authActionLimiter,
  validate(createTaskDto),
  taskController.create
);
router.get('/tasks/:taskId', authReadLimiter, taskController.get);
router.put(
  '/tasks/:taskId',
  authActionLimiter,
  validate(updateTaskDto),
  taskController.update
);
router.delete('/tasks/:taskId', authActionLimiter, taskController.remove);

// tags
router.get('/tags', authReadLimiter, tagController.list);
router.post(
  '/tags',
  authActionLimiter,
  validate(createTagDto),
  tagController.create
);
router.put(
  '/tags/:tagId',
  authActionLimiter,
  validate(updateTagDto),
  tagController.update
);
router.delete('/tags/:tagId', authActionLimiter, tagController.remove);

export default router;
