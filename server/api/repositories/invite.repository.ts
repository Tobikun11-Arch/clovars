import {InviteModel, InviteDocument} from '../models/Invite.model';

export const inviteRepository = {
  create: (data: {
    workspaceId: string;
    email?: string | null;
    code: string;
    role: 'admin' | 'member';
    createdBy: string;
    expiresAt: Date;
  }): Promise<InviteDocument> => InviteModel.create(data),

  findById: (id: string): Promise<InviteDocument | null> =>
    InviteModel.findById(id).exec(),

  findByCode: (code: string): Promise<InviteDocument | null> =>
    InviteModel.findOne({code: code.toUpperCase()}).exec(),

  findByWorkspace: (workspaceId: string): Promise<InviteDocument[]> =>
    InviteModel.find({workspaceId}).sort({createdAt: -1}).exec(),

  findPendingByEmail: (email: string): Promise<InviteDocument[]> =>
    InviteModel.find({
      email: email.toLowerCase(),
      status: 'pending'
    })
      .sort({createdAt: -1})
      .exec(),

  findPendingByWorkspaceAndEmail: (
    workspaceId: string,
    email: string
  ): Promise<InviteDocument | null> =>
    InviteModel.findOne({
      workspaceId,
      email: email.toLowerCase(),
      status: 'pending'
    }).exec(),

  markAccepted: (id: string, acceptedBy: string): Promise<unknown> =>
    InviteModel.updateOne(
      {_id: id},
      {$set: {status: 'accepted', acceptedBy, acceptedAt: new Date()}}
    ).exec(),

  markRevoked: (id: string): Promise<unknown> =>
    InviteModel.updateOne({_id: id}, {$set: {status: 'revoked'}}).exec(),

  deleteByWorkspace: (workspaceId: string): Promise<unknown> =>
    InviteModel.deleteMany({workspaceId}).exec()
};
