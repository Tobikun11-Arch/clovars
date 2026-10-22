import {WorkspaceModel, WorkspaceDocument} from '../models/Workspace.model';

export const workspaceRepository = {
  create: (data: {name: string; ownerId: string}): Promise<WorkspaceDocument> =>
    WorkspaceModel.create(data),

  findById: (id: string): Promise<WorkspaceDocument | null> =>
    WorkspaceModel.findById(id).exec(),

  findByNameForOwner: (name: string, ownerId: string): Promise<WorkspaceDocument | null> =>
    WorkspaceModel.findOne({name, ownerId}).exec(),

  updateName: (id: string, name: string): Promise<unknown> =>
    WorkspaceModel.updateOne({_id: id}, {$set: {name}}).exec(),

  delete: (id: string): Promise<unknown> => WorkspaceModel.deleteOne({_id: id}).exec()
};
