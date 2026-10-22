import {Request, Response, NextFunction} from 'express';
import {workspaceService} from '../services/workspace.service';
import {getActor} from '../utils/actor';
import {ApiError} from '../utils/error';
import {ErrorCodes} from '../constants/errorCodes';

export const workspaceController = {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const actor = await getActor(req);
      const workspace = await workspaceService.createWorkspace(
        actor,
        req.body.name
      );

      res.status(201).json({workspace});
    } catch (error) {
      next(error);
    }
  },

  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const actor = await getActor(req);
      const workspaces = await workspaceService.listWorkspaces(actor);

      res.status(200).json({workspaces});
    } catch (error) {
      next(error);
    }
  },

  async get(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.workspace || !req.membership) {
        throw new ApiError(
          404,
          ErrorCodes.WORKSPACE_NOT_FOUND,
          'Workspace not found'
        );
      }

      res.status(200).json({
        workspace: {
          id: req.workspace.id,
          name: req.workspace.name,
          ownerId: req.workspace.ownerId,
          role: req.membership.role,
          createdAt: req.workspace.createdAt
        }
      });
    } catch (error) {
      next(error);
    }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const workspaceId = req.params.workspaceId;
      const workspace = await workspaceService.updateWorkspace(
        workspaceId,
        req.body.name
      );

      res.status(200).json({workspace});
    } catch (error) {
      next(error);
    }
  },

  async remove(req: Request, res: Response, next: NextFunction) {
    try {
      await workspaceService.deleteWorkspace(req.params.workspaceId);

      res.status(200).json({message: 'Workspace deleted'});
    } catch (error) {
      next(error);
    }
  },

  async listMembers(req: Request, res: Response, next: NextFunction) {
    try {
      const members = await workspaceService.listMembers(req.params.workspaceId);

      res.status(200).json({members});
    } catch (error) {
      next(error);
    }
  },

  async updateMemberRole(req: Request, res: Response, next: NextFunction) {
    try {
      const actor = await getActor(req);
      const member = await workspaceService.updateMemberRole(
        req.params.workspaceId,
        req.params.memberId,
        req.body.role,
        actor
      );

      res.status(200).json({member});
    } catch (error) {
      next(error);
    }
  },

  async removeMember(req: Request, res: Response, next: NextFunction) {
    try {
      const actor = await getActor(req);
      await workspaceService.removeMember(
        req.params.workspaceId,
        req.params.memberId,
        actor
      );

      res.status(200).json({message: 'Member removed'});
    } catch (error) {
      next(error);
    }
  }
};
