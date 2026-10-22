import {
  MembershipModel,
  MembershipDocument,
  WorkspaceRole
} from '../models/Membership.model';

export const membershipRepository = {
  create: (data: {
    workspaceId: string;
    userId: string;
    email: string;
    firstName?: string;
    lastName?: string;
    role: WorkspaceRole;
  }): Promise<MembershipDocument> => MembershipModel.create(data),

  findById: (id: string): Promise<MembershipDocument | null> =>
    MembershipModel.findById(id).exec(),

  findByWorkspaceAndUser: (
    workspaceId: string,
    userId: string
  ): Promise<MembershipDocument | null> =>
    MembershipModel.findOne({workspaceId, userId}).exec(),

  findByWorkspace: (workspaceId: string): Promise<MembershipDocument[]> =>
    MembershipModel.find({workspaceId}).sort({createdAt: 1}).exec(),

  findByUser: (userId: string): Promise<MembershipDocument[]> =>
    MembershipModel.find({userId}).sort({createdAt: 1}).exec(),

  findByEmail: (email: string): Promise<MembershipDocument[]> =>
    MembershipModel.find({email: email.toLowerCase()}).exec(),

  updateRole: (
    membershipId: string,
    role: WorkspaceRole
  ): Promise<unknown> =>
    MembershipModel.updateOne({_id: membershipId}, {$set: {role}}).exec(),

  delete: (membershipId: string): Promise<unknown> =>
    MembershipModel.deleteOne({_id: membershipId}).exec(),

  deleteByWorkspace: (workspaceId: string): Promise<unknown> =>
    MembershipModel.deleteMany({workspaceId}).exec()
};
