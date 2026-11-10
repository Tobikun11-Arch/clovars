import {userRepository} from '../repositories/user.repository';
import {adminRepository} from '../repositories/admin.repository';
import {membershipRepository} from '../repositories/membership.repository';
import {BaseUserDocument} from '../models/base/BaseUser.schema';
import {ApiError} from '../utils/error';
import {ErrorCodes} from '../constants/errorCodes';
import {UpdateProfileDto} from '../dtos/profile.dto';

type AccountType = 'user' | 'admin';

export type ProfileDto = {
  id: string;
  type: AccountType;
  email: string;
  firstName: string;
  lastName: string;
  username: string | null;
  avatarUrl: string | null;
};

function repositoryFor(type: AccountType) {
  return type === 'admin' ? adminRepository : userRepository;
}

export function toProfileDto(
  account: BaseUserDocument,
  type: AccountType
): ProfileDto {
  return {
    id: String(account._id),
    type,
    email: account.email,
    firstName: account.firstName,
    lastName: account.lastName,
    username: account.username ?? null,
    avatarUrl: account.avatar ?? null
  };
}

function isDuplicateKeyError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as {code?: number}).code === 11000
  );
}

async function loadProfile(
  userId: string,
  type: AccountType
): Promise<ProfileDto> {
  const account = await repositoryFor(type).findProfileById(userId);

  if (!account) {
    throw new ApiError(404, ErrorCodes.USER_NOT_FOUND, 'User not found');
  }

  return toProfileDto(account, type);
}

export const profileService = {
  getProfile: loadProfile,

  async updateProfile(
    userId: string,
    type: AccountType,
    data: UpdateProfileDto
  ): Promise<ProfileDto> {
    try {
      await repositoryFor(type).updateProfile(userId, data);
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        throw new ApiError(
          409,
          ErrorCodes.USERNAME_EXISTS,
          'That username is already taken'
        );
      }
      throw error;
    }

    // Workspace memberships keep a copy of the name for member lists.
    await membershipRepository.updateNameByUser(userId, {
      firstName: data.firstName,
      lastName: data.lastName
    });

    return loadProfile(userId, type);
  },

  async updateAvatar(
    userId: string,
    type: AccountType,
    avatar: string | null
  ): Promise<ProfileDto> {
    await repositoryFor(type).updateAvatar(userId, avatar);
    return loadProfile(userId, type);
  }
};
