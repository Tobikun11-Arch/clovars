import {TaskModel, TaskDocument} from '../models/Task.model';

export const taskRepository = {
  create: (data: {
    workspaceId: string;
    projectId: string;
    name: string;
    description?: string | null;
    archived?: boolean;
    createdBy: string;
  }): Promise<TaskDocument> => TaskModel.create(data),

  findByIdInWorkspace: (
    id: string,
    workspaceId: string
  ): Promise<TaskDocument | null> =>
    TaskModel.findOne({_id: id, workspaceId}).exec(),

  findByWorkspace: (
    workspaceId: string,
    projectId?: string
  ): Promise<TaskDocument[]> => {
    const filter: Record<string, unknown> = {workspaceId};
    if (projectId) filter.projectId = projectId;

    return TaskModel.find(filter).sort({name: 1}).exec();
  },

  findByNameInProject: (
    workspaceId: string,
    projectId: string,
    name: string
  ): Promise<TaskDocument | null> =>
    TaskModel.findOne({workspaceId, projectId, name}).exec(),

  update: (
    id: string,
    data: {
      name?: string;
      description?: string | null;
      projectId?: string;
      archived?: boolean;
    }
  ): Promise<unknown> => TaskModel.updateOne({_id: id}, {$set: data}).exec(),

  delete: (id: string): Promise<unknown> => TaskModel.deleteOne({_id: id}).exec(),

  deleteByProject: (projectId: string): Promise<unknown> =>
    TaskModel.deleteMany({projectId}).exec(),

  deleteByWorkspace: (workspaceId: string): Promise<unknown> =>
    TaskModel.deleteMany({workspaceId}).exec()
};
