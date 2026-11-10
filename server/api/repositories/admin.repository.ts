import {AdminModel, AdminDocument} from '../models/Admin.model';

export const adminRepository = {
  findByEmail: (email: string) =>
    AdminModel.findOne({email: email.toLowerCase()}).exec(),

  findByEmailOrUsername: (identifier: string) =>
    AdminModel.findOne({
      $or: [{email: identifier.toLowerCase()}, {username: identifier}]
    }).exec(),

  findById: (id: string) => AdminModel.findById(id).exec(),

  findProfileById: (id: string) =>
    AdminModel.findById(id).select('+avatar').exec(),

  updateProfile: (
    userId: string,
    data: {firstName?: string; lastName?: string; username?: string}
  ) => AdminModel.updateOne({_id: userId}, {$set: data}, {runValidators: true}).exec(),

  updateAvatar: (userId: string, avatar: string | null) =>
    AdminModel.updateOne({_id: userId}, {$set: {avatar}}).exec(),

  updatePassword: (userId: string, passwordHash: string) =>
    AdminModel.updateOne({_id: userId}, {passwordHash}).exec(),

  create: (data: Partial<AdminDocument>) => AdminModel.create(data)
};