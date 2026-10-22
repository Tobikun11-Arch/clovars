import {randomBytes} from 'crypto';
import {inviteRepository} from '../repositories/invite.repository';
import {membershipRepository} from '../repositories/membership.repository';
import {workspaceRepository} from '../repositories/workspace.repository';
import {emailService} from './email.service';
import {inviteEmailTemplate} from '../templates/inviteEmail';
import {ApiError} from '../utils/error';
import {ErrorCodes} from '../constants/errorCodes';

const INVITE_TTL_HOURS = 168; // 7 days
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

type Actor = {
  userId: string;
  email: string;
  firstName?: string;
  lastName?: string;
};

function generateInviteCode(length = 8): string {
  const bytes = randomBytes(length);
  let code = '';

  for (let index = 0; index < length; index += 1) {
    code += CODE_ALPHABET[bytes[index] % CODE_ALPHABET.length];
  }

  return code;
}

async function generateUniqueCode(): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const code = generateInviteCode();
    const existing = await inviteRepository.findByCode(code);

    if (!existing) return code;
  }

  throw new ApiError(
    500,
    ErrorCodes.INTERNAL_ERROR,
    'Could not generate an invite code, please try again'
  );
}

export const inviteService = {
  async createInvite(params: {
    workspaceId: string;
    workspaceName: string;
    createdBy: string;
    createdByName?: string;
    email?: string;
    role: 'admin' | 'member';
  }) {
    const code = await generateUniqueCode();
    const expiresAt = new Date(
      Date.now() + INVITE_TTL_HOURS * 60 * 60 * 1000
    );

    const invite = await inviteRepository.create({
      workspaceId: params.workspaceId,
      email: params.email ? params.email.toLowerCase() : null,
      code,
      role: params.role,
      createdBy: params.createdBy,
      expiresAt
    });

    let emailSent = false;

    if (params.email) {
      const template = inviteEmailTemplate({
        code,
        workspaceName: params.workspaceName,
        role: params.role,
        inviterName: params.createdByName,
        expiresInHours: INVITE_TTL_HOURS
      });

      try {
        await emailService.sendEmail({
          to: params.email,
          subject: template.subject,
          text: template.text,
          html: template.html
        });
        emailSent = true;
      } catch {
        emailSent = false;
      }
    }

    return {
      id: invite.id,
      workspaceId: invite.workspaceId,
      email: invite.email ?? null,
      code: invite.code,
      role: invite.role,
      status: invite.status,
      expiresAt: invite.expiresAt,
      createdAt: invite.createdAt,
      emailSent
    };
  },

  async listInvites(workspaceId: string) {
    const invites = await inviteRepository.findByWorkspace(workspaceId);

    return invites.map(invite => ({
      id: invite.id,
      workspaceId: invite.workspaceId,
      email: invite.email ?? null,
      code: invite.code,
      role: invite.role,
      status: invite.status,
      expiresAt: invite.expiresAt,
      createdAt: invite.createdAt
    }));
  },

  async revokeInvite(workspaceId: string, inviteId: string): Promise<void> {
    const invite = await inviteRepository.findById(inviteId);

    if (!invite || invite.workspaceId !== workspaceId) {
      throw new ApiError(
        404,
        ErrorCodes.INVITE_NOT_FOUND,
        'Invite not found in this workspace'
      );
    }

    if (invite.status === 'accepted') {
      throw new ApiError(
        409,
        ErrorCodes.INVITE_ALREADY_ACCEPTED,
        'This invite was already accepted'
      );
    }

    await inviteRepository.markRevoked(invite.id);
  },

  async previewInvite(code: string) {
    const invite = await inviteRepository.findByCode(code.trim());

    if (!invite) {
      throw new ApiError(
        404,
        ErrorCodes.INVITE_NOT_FOUND,
        'Invite not found'
      );
    }

    const workspace = await workspaceRepository.findById(invite.workspaceId);

    return {
      id: invite.id,
      code: invite.code,
      role: invite.role,
      status: invite.status,
      expiresAt: invite.expiresAt,
      emailRequired: Boolean(invite.email),
      workspaceName: workspace ? workspace.name : 'Unknown workspace'
    };
  },

  async listMyInvites(actor: Actor) {
    const invites = await inviteRepository.findPendingByEmail(actor.email);

    return Promise.all(
      invites.map(async invite => {
        const workspace = await workspaceRepository.findById(invite.workspaceId);

        return {
          id: invite.id,
          code: invite.code,
          role: invite.role,
          status: invite.status,
          expiresAt: invite.expiresAt,
          workspaceId: invite.workspaceId,
          workspaceName: workspace ? workspace.name : 'Unknown workspace'
        };
      })
    );
  },

  async acceptInvite(code: string, actor: Actor) {
    const invite = await inviteRepository.findByCode(code.trim());

    if (!invite) {
      throw new ApiError(404, ErrorCodes.INVITE_NOT_FOUND, 'Invite not found');
    }

    if (invite.status === 'revoked') {
      throw new ApiError(
        400,
        ErrorCodes.INVITE_REVOKED,
        'This invite was revoked'
      );
    }

    if (invite.status === 'accepted') {
      throw new ApiError(
        409,
        ErrorCodes.INVITE_ALREADY_ACCEPTED,
        'This invite was already used'
      );
    }

    if (invite.expiresAt.getTime() < Date.now()) {
      throw new ApiError(
        400,
        ErrorCodes.INVITE_EXPIRED,
        'This invite has expired'
      );
    }

    if (
      invite.email &&
      invite.email.toLowerCase() !== actor.email.toLowerCase()
    ) {
      throw new ApiError(
        403,
        ErrorCodes.INVITE_EMAIL_MISMATCH,
        'This invite was sent to a different email address'
      );
    }

    const existingMembership =
      await membershipRepository.findByWorkspaceAndUser(
        invite.workspaceId,
        actor.userId
      );

    if (existingMembership) {
      throw new ApiError(
        409,
        ErrorCodes.ALREADY_A_MEMBER,
        'You are already a member of this workspace'
      );
    }

    const membership = await membershipRepository.create({
      workspaceId: invite.workspaceId,
      userId: actor.userId,
      email: actor.email,
      firstName: actor.firstName,
      lastName: actor.lastName,
      role: invite.role
    });

    await inviteRepository.markAccepted(invite.id, actor.userId);

    const workspace = await workspaceRepository.findById(invite.workspaceId);

    return {
      membership: {
        id: membership.id,
        workspaceId: membership.workspaceId,
        userId: membership.userId,
        email: membership.email,
        role: membership.role,
        joinedAt: membership.createdAt
      },
      workspace: workspace
        ? {id: workspace.id, name: workspace.name, role: membership.role}
        : null
    };
  }
};
