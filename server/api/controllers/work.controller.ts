import {Request, Response, NextFunction} from 'express';
import {
  clientService,
  projectService,
  taskService,
  tagService
} from '../services/work.service';
import {getActor} from '../utils/actor';

function getQueryString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

export const clientController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const clients = await clientService.list(req.params.workspaceId);

      res.status(200).json({clients});
    } catch (error) {
      next(error);
    }
  },

  async get(req: Request, res: Response, next: NextFunction) {
    try {
      const client = await clientService.get(
        req.params.workspaceId,
        req.params.clientId
      );

      res.status(200).json({client});
    } catch (error) {
      next(error);
    }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const actor = await getActor(req);
      const client = await clientService.create(
        req.params.workspaceId,
        actor.userId,
        req.body
      );

      res.status(201).json({client});
    } catch (error) {
      next(error);
    }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const client = await clientService.update(
        req.params.workspaceId,
        req.params.clientId,
        req.body
      );

      res.status(200).json({client});
    } catch (error) {
      next(error);
    }
  },

  async remove(req: Request, res: Response, next: NextFunction) {
    try {
      await clientService.remove(req.params.workspaceId, req.params.clientId);

      res.status(200).json({message: 'Client deleted'});
    } catch (error) {
      next(error);
    }
  }
};

export const projectController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const projects = await projectService.list(
        req.params.workspaceId,
        getQueryString(req.query.clientId)
      );

      res.status(200).json({projects});
    } catch (error) {
      next(error);
    }
  },

  async get(req: Request, res: Response, next: NextFunction) {
    try {
      const project = await projectService.get(
        req.params.workspaceId,
        req.params.projectId
      );

      res.status(200).json({project});
    } catch (error) {
      next(error);
    }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const actor = await getActor(req);
      const project = await projectService.create(
        req.params.workspaceId,
        actor.userId,
        req.body
      );

      res.status(201).json({project});
    } catch (error) {
      next(error);
    }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const project = await projectService.update(
        req.params.workspaceId,
        req.params.projectId,
        req.body
      );

      res.status(200).json({project});
    } catch (error) {
      next(error);
    }
  },

  async remove(req: Request, res: Response, next: NextFunction) {
    try {
      await projectService.remove(
        req.params.workspaceId,
        req.params.projectId
      );

      res.status(200).json({message: 'Project deleted'});
    } catch (error) {
      next(error);
    }
  }
};

export const taskController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const tasks = await taskService.list(
        req.params.workspaceId,
        getQueryString(req.query.projectId)
      );

      res.status(200).json({tasks});
    } catch (error) {
      next(error);
    }
  },

  async get(req: Request, res: Response, next: NextFunction) {
    try {
      const task = await taskService.get(
        req.params.workspaceId,
        req.params.taskId
      );

      res.status(200).json({task});
    } catch (error) {
      next(error);
    }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const actor = await getActor(req);
      const task = await taskService.create(
        req.params.workspaceId,
        actor.userId,
        req.body
      );

      res.status(201).json({task});
    } catch (error) {
      next(error);
    }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const task = await taskService.update(
        req.params.workspaceId,
        req.params.taskId,
        req.body
      );

      res.status(200).json({task});
    } catch (error) {
      next(error);
    }
  },

  async remove(req: Request, res: Response, next: NextFunction) {
    try {
      await taskService.remove(req.params.workspaceId, req.params.taskId);

      res.status(200).json({message: 'Task deleted'});
    } catch (error) {
      next(error);
    }
  }
};

export const tagController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const tags = await tagService.list(req.params.workspaceId);

      res.status(200).json({tags});
    } catch (error) {
      next(error);
    }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const actor = await getActor(req);
      const tag = await tagService.create(
        req.params.workspaceId,
        actor.userId,
        req.body
      );

      res.status(201).json({tag});
    } catch (error) {
      next(error);
    }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const tag = await tagService.update(
        req.params.workspaceId,
        req.params.tagId,
        req.body
      );

      res.status(200).json({tag});
    } catch (error) {
      next(error);
    }
  },

  async remove(req: Request, res: Response, next: NextFunction) {
    try {
      await tagService.remove(req.params.workspaceId, req.params.tagId);

      res.status(200).json({message: 'Tag deleted'});
    } catch (error) {
      next(error);
    }
  }
};
