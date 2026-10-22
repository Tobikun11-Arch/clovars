import {workspaceRepository} from '../repositories/workspace.repository';
import {membershipRepository} from '../repositories/membership.repository';
import {inviteRepository} from '../repositories/invite.repository';
import {clientRepository} from '../repositories/client.repository';
import {projectRepository} from '../repositories/project.repository';
import {taskRepository} from '../repositories/task.repository';
import {tagRepository} from '../repositories/tag.repository';
import {WorkspaceRole} from '../models/Membership.model';
import {ApiError} from '../utils/error';
import {ErrorCodes} from '../constants/errorCodes';

type Actor = {
  userId: string;
  email: string;
  firstName?: string;
  lastName?: string;
};

function toMemberDto(membership: {
  _id: unknown;
  userId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: WorkspaceRole;
  createdAt: Date;
}) {
  return {
    id: String(membership._id),
    userId: membership.userId,
    email: membership.email,
    firstName: membership.firstName ?? null,
    lastName: membership.lastName ?? null,
    role: membership.role,
    joinedAt: membership.createdAt
  };
}

export const workspaceService = {
  async createWorkspace(actor: Actor, name: string) {
    const trimmedName = name.trim();
    const existing = await workspaceRepository.findByNameForOwner(
      trimmedName,
      actor.userId
    );

    if (existing) {
      throw new ApiError(
        409,
        ErrorCodes.WORKSPACE_NAME_TAKEN,
        'You already have a workspace with that name'
      );
    }

    const workspace = await workspaceRepository.create({
      name: trimmedName,
      ownerId: actor.userId
    });

    await membershipRepository.create({
      workspaceId: workspace.id,
      userId: actor.userId,
      email: actor.email,
      firstName: actor.firstName,
      lastName: actor.lastName,
      role: 'owner'
    });

    return {
      id: workspace.id,
      name: workspace.name,
      ownerId: workspace.ownerId,
      role: 'owner' as WorkspaceRole,
      createdAt: workspace.createdAt
    };
  },

  async listWorkspaces(actor: Actor) {
    const memberships = await membershipRepository.findByUser(actor.userId);

    const workspaces = await Promise.all(
      memberships.map(async membership => {
        const workspace = await workspaceRepository.findById(
          membership.workspaceId
        );

        if (!workspace) return null;

        return {
          id: workspace.id,
          name: workspace.name,
          ownerId: workspace.ownerId,
          role: membership.role,
          createdAt: workspace.createdAt
        };
      })
    );

    return workspaces.filter(
      (workspace): workspace is NonNullable<typeof workspace> => workspace !== null
    );
  },

  async updateWorkspace(workspaceId: string, name: string) {
    const trimmedName = name.trim();
    const workspace = await workspaceRepository.findById(workspaceId);

    if (!workspace) {
      throw new ApiError(
        404,
        ErrorCodes.WORKSPACE_NOT_FOUND,
        'Workspace not found'
      );
    }

    const duplicate = await workspaceRepository.findByNameForOwner(
      trimmedName,
      workspace.ownerId
    );

    if (duplicate && duplicate.id !== workspaceId) {
      throw new ApiError(
        409,
        ErrorCodes.WORKSPACE_NAME_TAKEN,
        'A workspace with that name already exists'
      );
    }

    await workspaceRepository.updateName(workspaceId, trimmedName);

    return {id: workspaceId, name: trimmedName};
  },

  async deleteWorkspace(workspaceId: string): Promise<void> {
    await membershipRepository.deleteByWorkspace(workspaceId);
    await inviteRepository.deleteByWorkspace(workspaceId);
    await taskRepository.deleteByWorkspace(workspaceId);
    await projectRepository.deleteByWorkspace(workspaceId);
    await clientRepository.deleteByWorkspace(workspaceId);
    await tagRepository.deleteByWorkspace(workspaceId);
    await workspaceRepository.delete(workspaceId);
  },

  async listMembers(workspaceId: string) {
    const memberships = await membershipRepository.findByWorkspace(workspaceId);
    return memberships.map(toMemberDto);
  },

  async updateMemberRole(
    workspaceId: string,
    memberId: string,
    role: WorkspaceRole,
    actor: Actor
  ) {
    const membership = await membershipRepository.findByWorkspaceAndUser(
      workspaceId,
      actor.userId
    );

    if (!membership || membership.role !== 'owner') {
      throw new ApiError(
        403,
        ErrorCodes.INSUFFICIENT_ROLE,
        'Only the workspace owner can change member roles'
      );
    }

    const target = await membershipRepository.findById(memberId);

    if (!target || target.workspaceId !== workspaceId) {
      throw new ApiError(
        404,
        ErrorCodes.USER_NOT_FOUND,
        'Member not found in this workspace'
      );
    }

    if (target.role === 'owner') {
      throw new ApiError(
        403,
        ErrorCodes.CANNOT_MODIFY_OWNER,
        'The workspace owner role cannot be changed'
      );
    }

    await membershipRepository.updateRole(target.id, role);

    return {...toMemberDto(target), role};
  },

  async removeMember(
    workspaceId: string,
    memberId: string,
    actor: Actor
  ): Promise<void> {
    const actorMembership = await membershipRepository.findByWorkspaceAndUser(
      workspaceId,
      actor.userId
    );

    if (!actorMembership) {
      throw new ApiError(
        403,
        ErrorCodes.NOT_WORKSPACE_MEMBER,
        'You are not a member of this workspace'
      );
    }

    if (actorMembership.role === 'member') {
      throw new ApiError(
        403,
        ErrorCodes.INSUFFICIENT_ROLE,
        'Admin access required for this action'
      );
    }

    const target = await membershipRepository.findById(memberId);

    if (!target || target.workspaceId !== workspaceId) {
      throw new ApiError(
        404,
        ErrorCodes.USER_NOT_FOUND,
        'Member not found in this workspace'
      );
    }

    if (target.role === 'owner') {
      throw new ApiError(
        403,
        ErrorCodes.CANNOT_MODIFY_OWNER,
        'The workspace owner cannot be removed'
      );
    }

    if (actorMembership.role === 'admin' && target.role === 'admin') {
      throw new ApiError(
        403,
        ErrorCodes.INSUFFICIENT_ROLE,
        'Only the workspace owner can remove another admin'
      );
    }

    await membershipRepository.delete(target.id);
  }
};
