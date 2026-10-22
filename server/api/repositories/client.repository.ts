import {ClientModel, ClientDocument} from '../models/Client.model';

export const clientRepository = {
  create: (data: {
    workspaceId: string;
    name: string;
    notes?: string | null;
    color?: string | null;
    createdBy: string;
  }): Promise<ClientDocument> => ClientModel.create(data),

  findByIdInWorkspace: (
    id: string,
    workspaceId: string
  ): Promise<ClientDocument | null> =>
    ClientModel.findOne({_id: id, workspaceId}).exec(),

  findByWorkspace: (workspaceId: string): Promise<ClientDocument[]> =>
    ClientModel.find({workspaceId}).sort({name: 1}).exec(),

  findByNameInWorkspace: (
    workspaceId: string,
    name: string
  ): Promise<ClientDocument | null> =>
    ClientModel.findOne({workspaceId, name}).exec(),

  update: (
    id: string,
    data: {name?: string; notes?: string | null; color?: string | null}
  ): Promise<unknown> => ClientModel.updateOne({_id: id}, {$set: data}).exec(),

  delete: (id: string): Promise<unknown> =>
    ClientModel.deleteOne({_id: id}).exec(),

  deleteByWorkspace: (workspaceId: string): Promise<unknown> =>
    ClientModel.deleteMany({workspaceId}).exec()
};
