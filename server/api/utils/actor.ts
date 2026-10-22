import {Request} from 'express';
import {userRepository} from '../repositories/user.repository';
import {adminRepository} from '../repositories/admin.repository';
import {ApiError} from '../utils/error';
import {ErrorCodes} from '../constants/errorCodes';

export type Actor = {
  userId: string;
  email: string;
  firstName?: string;
  lastName?: string;
};

export async function getActor(req: Request): Promise<Actor> {
  if (!req.auth) {
    throw new ApiError(401, ErrorCodes.UNAUTHORIZED, 'Not authenticated');
  }

  const account =
    req.auth.type === 'admin'
      ? await adminRepository.findById(req.auth.userId)
      : await userRepository.findById(req.auth.userId);

  if (!account) {
    throw new ApiError(401, ErrorCodes.UNAUTHORIZED, 'Account not found');
  }

  return {
    userId: account._id.toString(),
    email: account.email,
    firstName: account.firstName,
    lastName: account.lastName
  };
}
