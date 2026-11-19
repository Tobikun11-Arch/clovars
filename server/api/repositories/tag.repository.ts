import {TagModel, TagDocument} from '../models/Tag.model';

export const tagRepository = {
  create: (data: {
    workspaceId: string;
    name: string;
    color: string;
    createdBy: string;
  }): Promise<TagDocument> => TagModel.create(data),

  findByIdInWorkspace: (
    id: string,
    workspaceId: string
  ): Promise<TagDocument | null> =>
    TagModel.findOne({_id: id, workspaceId}).exec(),

  findByWorkspace: (workspaceId: string): Promise<TagDocument[]> =>
    TagModel.find({workspaceId}).sort({name: 1}).exec(),

  /** Id, name and colour only, as plain objects: for labelling time entries. */
  findLabelsByWorkspace: (
    workspaceId: string
  ): Promise<Array<{_id: unknown; name: string; color: string}>> =>
    TagModel.find({workspaceId}, {name: 1, color: 1}).lean().exec() as Promise<
      Array<{_id: unknown; name: string; color: string}>
    >,

  findByNameInWorkspace: (
    workspaceId: string,
    name: string
  ): Promise<TagDocument | null> =>
    TagModel.findOne({workspaceId, name}).exec(),

  update: (
    id: string,
    data: {name?: string; color?: string}
  ): Promise<unknown> => TagModel.updateOne({_id: id}, {$set: data}).exec(),

  delete: (id: string): Promise<unknown> => TagModel.deleteOne({_id: id}).exec(),

  deleteByWorkspace: (workspaceId: string): Promise<unknown> =>
    TagModel.deleteMany({workspaceId}).exec()
};
