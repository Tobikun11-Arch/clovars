import {Request, Response, NextFunction} from 'express';
import {inviteService} from '../services/invite.service';
import {getActor} from '../utils/actor';
import {ApiError} from '../utils/error';
import {ErrorCodes} from '../constants/errorCodes';

export const inviteController = {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.workspace) {
        throw new ApiError(
          404,
          ErrorCodes.WORKSPACE_NOT_FOUND,
          'Workspace not found'
        );
      }

      const actor = await getActor(req);
      const invite = await inviteService.createInvite({
        workspaceId: req.workspace.id,
        workspaceName: req.workspace.name,
        createdBy: actor.userId,
        createdByName: actor.firstName
          ? `${actor.firstName}${
              actor.lastName ? ` ${actor.lastName}` : ''
            }`
          : undefined,
        email: req.body.email,
        role: req.body.role
      });

      res.status(201).json({invite});
    } catch (error) {
      next(error);
    }
  },

  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const invites = await inviteService.listInvites(req.params.workspaceId);

      res.status(200).json({invites});
    } catch (error) {
      next(error);
    }
  },

  async revoke(req: Request, res: Response, next: NextFunction) {
    try {
      await inviteService.revokeInvite(
        req.params.workspaceId,
        req.params.inviteId
      );

      res.status(200).json({message: 'Invite revoked'});
    } catch (error) {
      next(error);
    }
  },

  async mine(req: Request, res: Response, next: NextFunction) {
    try {
      const actor = await getActor(req);
      const invites = await inviteService.listMyInvites(actor);

      res.status(200).json({invites});
    } catch (error) {
      next(error);
    }
  },

  async preview(req: Request, res: Response, next: NextFunction) {
    try {
      const invite = await inviteService.previewInvite(req.params.code);

      res.status(200).json({invite});
    } catch (error) {
      next(error);
    }
  },

  async accept(req: Request, res: Response, next: NextFunction) {
    try {
      const actor = await getActor(req);
      const result = await inviteService.acceptInvite(req.body.code, actor);

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
};
