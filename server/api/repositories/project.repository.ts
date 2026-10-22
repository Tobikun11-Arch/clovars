import {ProjectModel, ProjectDocument} from '../models/Project.model';

export const projectRepository = {
  create: (data: {
    workspaceId: string;
    clientId?: string | null;
    name: string;
    color?: string | null;
    archived?: boolean;
    createdBy: string;
  }): Promise<ProjectDocument> => ProjectModel.create(data),

  findByIdInWorkspace: (
    id: string,
    workspaceId: string
  ): Promise<ProjectDocument | null> =>
    ProjectModel.findOne({_id: id, workspaceId}).exec(),

  findByWorkspace: (
    workspaceId: string,
    clientId?: string
  ): Promise<ProjectDocument[]> => {
    const filter: Record<string, unknown> = {workspaceId};
    if (clientId) filter.clientId = clientId;

    return ProjectModel.find(filter).sort({name: 1}).exec();
  },

  findByNameInWorkspace: (
    workspaceId: string,
    name: string
  ): Promise<ProjectDocument | null> =>
    ProjectModel.findOne({workspaceId, name}).exec(),

  update: (
    id: string,
    data: {
      name?: string;
      clientId?: string | null;
      color?: string | null;
      archived?: boolean;
    }
  ): Promise<unknown> => ProjectModel.updateOne({_id: id}, {$set: data}).exec(),

  clearClient: (clientId: string): Promise<unknown> =>
    ProjectModel.updateMany({clientId}, {$set: {clientId: null}}).exec(),

  delete: (id: string): Promise<unknown> =>
    ProjectModel.deleteOne({_id: id}).exec(),

  deleteByWorkspace: (workspaceId: string): Promise<unknown> =>
    ProjectModel.deleteMany({workspaceId}).exec()
};
