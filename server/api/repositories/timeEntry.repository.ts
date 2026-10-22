import {TimeEntryModel, TimeEntryDocument} from '../models/TimeEntry.model';

export type TimeEntryListFilters = {
  from?: Date;
  to?: Date;
  projectId?: string;
  taskId?: string;
  limit?: number;
};

export type TimeEntryUpdate = {
  projectId?: string | null;
  taskId?: string | null;
  tagIds?: string[];
  description?: string | null;
  startTime?: Date;
  endTime?: Date | null;
  durationSeconds?: number;
  isRunning?: boolean;
  isPaused?: boolean;
  pausedAt?: Date | null;
  lastResumedAt?: Date | null;
};

export const timeEntryRepository = {
  create: (data: {
    workspaceId: string;
    userId: string;
    projectId?: string | null;
    taskId?: string | null;
    tagIds?: string[];
    description?: string | null;
    startTime: Date;
    endTime?: Date | null;
    durationSeconds?: number;
    isRunning?: boolean;
    isPaused?: boolean;
    pausedAt?: Date | null;
    lastResumedAt?: Date | null;
  }): Promise<TimeEntryDocument> => TimeEntryModel.create(data),

  findByIdInWorkspace: (
    id: string,
    workspaceId: string
  ): Promise<TimeEntryDocument | null> =>
    TimeEntryModel.findOne({_id: id, workspaceId}).exec(),

  findByIdForUser: (
    id: string,
    workspaceId: string,
    userId: string
  ): Promise<TimeEntryDocument | null> =>
    TimeEntryModel.findOne({_id: id, workspaceId, userId}).exec(),

  findRunningByUser: (userId: string): Promise<TimeEntryDocument | null> =>
    TimeEntryModel.findOne({userId, isRunning: true}).exec(),

  findRunningByUserAndWorkspace: (
    userId: string,
    workspaceId: string
  ): Promise<TimeEntryDocument | null> =>
    TimeEntryModel.findOne({userId, workspaceId, isRunning: true}).exec(),

  list: (
    workspaceId: string,
    userId: string,
    filters: TimeEntryListFilters = {}
  ): Promise<TimeEntryDocument[]> => {
    const query: Record<string, unknown> = {workspaceId, userId};

    if (filters.projectId) query.projectId = filters.projectId;
    if (filters.taskId) query.taskId = filters.taskId;

    if (filters.from || filters.to) {
      const range: Record<string, Date> = {};
      if (filters.from) range.$gte = filters.from;
      if (filters.to) range.$lte = filters.to;
      query.startTime = range;
    }

    return TimeEntryModel.find(query)
      .sort({startTime: -1})
      .limit(filters.limit ?? 100)
      .exec();
  },

  update: (id: string, data: TimeEntryUpdate): Promise<unknown> =>
    TimeEntryModel.updateOne({_id: id}, {$set: data}).exec(),

  delete: (id: string): Promise<unknown> =>
    TimeEntryModel.deleteOne({_id: id}).exec(),

  deleteByWorkspace: (workspaceId: string): Promise<unknown> =>
    TimeEntryModel.deleteMany({workspaceId}).exec(),

  clearProject: (projectId: string): Promise<unknown> =>
    TimeEntryModel.updateMany(
      {projectId},
      {$set: {projectId: null, taskId: null}}
    ).exec(),

  clearTask: (taskId: string): Promise<unknown> =>
    TimeEntryModel.updateMany({taskId}, {$set: {taskId: null}}).exec(),

  pullTag: (tagId: string): Promise<unknown> =>
    TimeEntryModel.updateMany({tagIds: tagId}, {$pull: {tagIds: tagId}}).exec()
};
