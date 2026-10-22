import {Request, Response, NextFunction} from 'express';
import {workspaceRepository} from '../repositories/workspace.repository';
import {membershipRepository} from '../repositories/membership.repository';
import {WorkspaceDocument} from '../models/Workspace.model';
import {
  MembershipDocument,
  WorkspaceRole
} from '../models/Membership.model';
import {ApiError} from '../utils/error';
import {ErrorCodes} from '../constants/errorCodes';

const ROLE_LEVEL: Record<WorkspaceRole, number> = {
  member: 1,
  admin: 2,
  owner: 3
};

declare global {
  namespace Express {
    interface Request {
      workspace?: WorkspaceDocument;
      membership?: MembershipDocument;
    }
  }
}

export async function loadWorkspace(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.auth) {
      throw new ApiError(401, ErrorCodes.UNAUTHORIZED, 'Not authenticated');
    }

    const workspaceId = req.params.workspaceId;

    if (!workspaceId) {
      throw new ApiError(
        400,
        ErrorCodes.VALIDATION_ERROR,
        'Workspace id is required'
      );
    }

    const workspace = await workspaceRepository.findById(workspaceId);

    if (!workspace) {
      throw new ApiError(
        404,
        ErrorCodes.WORKSPACE_NOT_FOUND,
        'Workspace not found'
      );
    }

    const membership = await membershipRepository.findByWorkspaceAndUser(
      workspaceId,
      req.auth.userId
    );

    if (!membership) {
      throw new ApiError(
        403,
        ErrorCodes.NOT_WORKSPACE_MEMBER,
        'You are not a member of this workspace'
      );
    }

    req.workspace = workspace;
    req.membership = membership;

    next();
  } catch (error) {
    next(error);
  }
}

export function requireWorkspaceRole(minRole: WorkspaceRole) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.auth || !req.membership) {
      return next(
        new ApiError(401, ErrorCodes.UNAUTHORIZED, 'Not authenticated')
      );
    }

    const currentLevel = ROLE_LEVEL[req.membership.role];
    const requiredLevel = ROLE_LEVEL[minRole];

    if (currentLevel < requiredLevel) {
      return next(
        new ApiError(
          403,
          ErrorCodes.INSUFFICIENT_ROLE,
          `${minRole} access required for this action`
        )
      );
    }

    return next();
  };
}
