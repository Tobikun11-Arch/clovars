import {
  timeEntryRepository,
  TimeEntryListFilters
} from '../repositories/timeEntry.repository';
import {projectRepository} from '../repositories/project.repository';
import {taskRepository} from '../repositories/task.repository';
import {tagRepository} from '../repositories/tag.repository';
import {workspaceRepository} from '../repositories/workspace.repository';
import {ApiError} from '../utils/error';
import {ErrorCodes} from '../constants/errorCodes';
import type {TimeEntryDocument} from '../models/TimeEntry.model';

const MAX_ENTRY_SECONDS = 24 * 60 * 60;

type LinkInput = {
  projectId?: string | null;
  taskId?: string | null;
  tagIds?: string[];
  description?: string | null;
};

type TagDto = {id: string; name: string; color: string};

type Lookup = {
  projects: Map<string, string>;
  tasks: Map<string, string>;
  tags: Map<string, TagDto>;
};

export async function buildLookup(workspaceId: string): Promise<Lookup> {
  const [projects, tasks, tags] = await Promise.all([
    projectRepository.findByWorkspace(workspaceId),
    taskRepository.findByWorkspace(workspaceId),
    tagRepository.findByWorkspace(workspaceId)
  ]);

  return {
    projects: new Map(projects.map((project) => [project.id, project.name])),
    tasks: new Map(tasks.map((task) => [task.id, task.name])),
    tags: new Map(
      tags.map((tag) => [
        tag.id,
        {id: tag.id, name: tag.name, color: tag.color}
      ])
    )
  };
}

function toTimeEntryDto(entry: TimeEntryDocument, lookup: Lookup) {
  return {
    id: entry.id,
    workspaceId: entry.workspaceId,
    projectId: entry.projectId ?? null,
    taskId: entry.taskId ?? null,
    tagIds: entry.tagIds ?? [],
    description: entry.description ?? null,
    startTime: entry.startTime,
    endTime: entry.endTime ?? null,
    durationSeconds: entry.durationSeconds,
    elapsedSeconds: computeElapsedSeconds(entry),
    isRunning: entry.isRunning,
    isPaused: Boolean(entry.isPaused),
    pausedAt: entry.pausedAt ?? null,
    lastResumedAt: entry.lastResumedAt ?? null,
    projectName: entry.projectId
      ? (lookup.projects.get(entry.projectId) ?? null)
      : null,
    taskName: entry.taskId ? (lookup.tasks.get(entry.taskId) ?? null) : null,
    tags: (entry.tagIds ?? [])
      .map((tagId) => lookup.tags.get(tagId))
      .filter((tag): tag is TagDto => Boolean(tag))
  };
}

function currentSegmentStart(entry: TimeEntryDocument): Date {
  return entry.lastResumedAt ?? entry.startTime;
}

export function computeElapsedSeconds(
  entry: TimeEntryDocument,
  at: Date = new Date()
): number {
  const accumulated = Math.max(0, entry.durationSeconds ?? 0);

  if (!entry.isRunning || entry.isPaused) return Math.floor(accumulated);

  const segmentSeconds = Math.max(
    0,
    (at.getTime() - currentSegmentStart(entry).getTime()) / 1000
  );

  return Math.floor(accumulated + segmentSeconds);
}

async function buildRunningEntryResponse(entryId: string, workspaceId: string) {
  const updated = await timeEntryRepository.findByIdInWorkspace(
    entryId,
    workspaceId
  );

  if (!updated) {
    throw new ApiError(
      404,
      ErrorCodes.TIME_ENTRY_NOT_FOUND,
      'The running entry could not be found'
    );
  }

  const [lookup, workspace] = await Promise.all([
    buildLookup(workspaceId),
    workspaceRepository.findById(workspaceId)
  ]);

  return {
    ...toTimeEntryDto(updated, lookup),
    workspaceName: workspace ? workspace.name : null
  };
}

function parseDate(value: string, field: string): Date {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new ApiError(
      400,
      ErrorCodes.INVALID_TIME_RANGE,
      `${field} is not a valid date`
    );
  }

  return date;
}

function computeDuration(startTime: Date, endTime: Date): number {
  const milliseconds = endTime.getTime() - startTime.getTime();

  if (milliseconds <= 0) {
    throw new ApiError(
      400,
      ErrorCodes.INVALID_TIME_RANGE,
      'End time must be after start time'
    );
  }

  const seconds = Math.round(milliseconds / 1000);

  if (seconds > MAX_ENTRY_SECONDS) {
    throw new ApiError(
      400,
      ErrorCodes.INVALID_TIME_RANGE,
      'A single entry cannot be longer than 24 hours'
    );
  }

  return Math.max(1, seconds);
}

async function resolveLinks(
  workspaceId: string,
  input: LinkInput
): Promise<{
  projectId: string | null;
  taskId: string | null;
  tagIds: string[];
}> {
  let projectId = input.projectId ?? null;
  let taskId = input.taskId ?? null;
  const tagIds = Array.from(new Set(input.tagIds ?? []));

  if (projectId) {
    const project = await projectRepository.findByIdInWorkspace(
      projectId,
      workspaceId
    );

    if (!project) {
      throw new ApiError(
        404,
        ErrorCodes.PROJECT_NOT_FOUND,
        'Project not found in this workspace'
      );
    }
  }

  if (taskId) {
    const task = await taskRepository.findByIdInWorkspace(taskId, workspaceId);

    if (!task) {
      throw new ApiError(
        404,
        ErrorCodes.TASK_NOT_FOUND,
        'Task not found in this workspace'
      );
    }

    if (projectId && task.projectId !== projectId) {
      throw new ApiError(
        400,
        ErrorCodes.INVALID_TASK_PROJECT,
        'The selected task does not belong to the selected project'
      );
    }

    projectId = task.projectId;
  }

  if (tagIds.length > 0) {
    const tags = await tagRepository.findByWorkspace(workspaceId);
    const knownIds = new Set(tags.map((tag) => tag.id));

    if (tagIds.some((tagId) => !knownIds.has(tagId))) {
      throw new ApiError(
        404,
        ErrorCodes.TAG_NOT_FOUND,
        'One or more tags were not found in this workspace'
      );
    }
  }

  return {projectId, taskId, tagIds};
}

export const timeEntryService = {
  async list(
    workspaceId: string,
    userId: string,
    filters: TimeEntryListFilters
  ) {
    const entries = await timeEntryRepository.list(
      workspaceId,
      userId,
      filters
    );
    const lookup = await buildLookup(workspaceId);

    return entries.map((entry) => toTimeEntryDto(entry, lookup));
  },

  async getRunning(workspaceId: string, userId: string) {
    const entry = await timeEntryRepository.findRunningByUserAndWorkspace(
      userId,
      workspaceId
    );

    if (!entry) return null;

    const lookup = await buildLookup(workspaceId);
    return toTimeEntryDto(entry, lookup);
  },

  async getEntry(workspaceId: string, userId: string, entryId: string) {
    const entry = await timeEntryRepository.findByIdForUser(
      entryId,
      workspaceId,
      userId
    );

    if (!entry) {
      throw new ApiError(
        404,
        ErrorCodes.TIME_ENTRY_NOT_FOUND,
        'Time entry not found in this workspace'
      );
    }

    const lookup = await buildLookup(workspaceId);
    return toTimeEntryDto(entry, lookup);
  },

  async getGlobalRunning(userId: string) {
    const entry = await timeEntryRepository.findRunningByUser(userId);

    if (!entry) return null;

    const [lookup, workspace] = await Promise.all([
      buildLookup(entry.workspaceId),
      workspaceRepository.findById(entry.workspaceId)
    ]);

    return {
      ...toTimeEntryDto(entry, lookup),
      workspaceName: workspace ? workspace.name : null
    };
  },

  async createManualEntry(
    workspaceId: string,
    userId: string,
    data: LinkInput & {startTime: string; endTime: string}
  ) {
    const links = await resolveLinks(workspaceId, data);
    const startTime = parseDate(data.startTime, 'Start time');
    const endTime = parseDate(data.endTime, 'End time');
    const durationSeconds = computeDuration(startTime, endTime);

    const entry = await timeEntryRepository.create({
      workspaceId,
      userId,
      projectId: links.projectId,
      taskId: links.taskId,
      tagIds: links.tagIds,
      description: data.description ?? null,
      startTime,
      endTime,
      durationSeconds,
      isRunning: false
    });

    const lookup = await buildLookup(workspaceId);
    return toTimeEntryDto(entry, lookup);
  },

  async startTimer(
    workspaceId: string,
    userId: string,
    data: LinkInput & {startTime?: string}
  ) {
    const existing = await timeEntryRepository.findRunningByUser(userId);

    if (existing) {
      throw new ApiError(
        409,
        ErrorCodes.TIMER_ALREADY_RUNNING,
        'You already have a timer running or paused. Stop it before starting a new one.',
        {entryId: existing.id, workspaceId: existing.workspaceId}
      );
    }

    const links = await resolveLinks(workspaceId, data);
    const startTime = data.startTime
      ? parseDate(data.startTime, 'Start time')
      : new Date();

    let entry: TimeEntryDocument;

    try {
      entry = await timeEntryRepository.create({
        workspaceId,
        userId,
        projectId: links.projectId,
        taskId: links.taskId,
        tagIds: links.tagIds,
        description: data.description ?? null,
        startTime,
        endTime: null,
        durationSeconds: 0,
        isRunning: true,
        isPaused: false,
        pausedAt: null,
        lastResumedAt: startTime
      });
    } catch (error) {
      if ((error as {code?: number}).code === 11000) {
        throw new ApiError(
          409,
          ErrorCodes.TIMER_ALREADY_RUNNING,
          'You already have a timer running. Stop it before starting a new one.'
        );
      }

      throw error;
    }

    const [lookup, workspace] = await Promise.all([
      buildLookup(workspaceId),
      workspaceRepository.findById(workspaceId)
    ]);

    return {
      ...toTimeEntryDto(entry, lookup),
      workspaceName: workspace ? workspace.name : null
    };
  },

  async stopTimer(userId: string, data: {endTime?: string}) {
    const running = await timeEntryRepository.findRunningByUser(userId);

    if (!running) {
      throw new ApiError(
        404,
        ErrorCodes.TIMER_NOT_RUNNING,
        'No running timer found'
      );
    }

    const endTime = data.endTime
      ? parseDate(data.endTime, 'End time')
      : new Date();

    if (endTime.getTime() <= running.startTime.getTime()) {
      endTime.setTime(running.startTime.getTime() + 1000);
    }

    const durationSeconds = Math.max(
      1,
      computeElapsedSeconds(running, endTime)
    );

    await timeEntryRepository.update(running.id, {
      endTime,
      durationSeconds,
      isRunning: false,
      isPaused: false,
      pausedAt: null,
      lastResumedAt: null
    });

    return buildRunningEntryResponse(running.id, running.workspaceId);
  },

  async pauseTimer(userId: string, data: {pausedAt?: string}) {
    const running = await timeEntryRepository.findRunningByUser(userId);

    if (!running) {
      throw new ApiError(
        404,
        ErrorCodes.TIMER_NOT_RUNNING,
        'No running timer found'
      );
    }

    if (running.isPaused) {
      throw new ApiError(
        409,
        ErrorCodes.TIMER_ALREADY_PAUSED,
        'The timer is already paused'
      );
    }

    const pausedAt = data.pausedAt
      ? parseDate(data.pausedAt, 'Paused time')
      : new Date();

    await timeEntryRepository.update(running.id, {
      durationSeconds: computeElapsedSeconds(running, pausedAt),
      isPaused: true,
      pausedAt,
      lastResumedAt: null
    });

    return buildRunningEntryResponse(running.id, running.workspaceId);
  },

  async resumeTimer(userId: string, data: {resumedAt?: string}) {
    const running = await timeEntryRepository.findRunningByUser(userId);

    if (!running) {
      throw new ApiError(
        404,
        ErrorCodes.TIMER_NOT_RUNNING,
        'No running timer found'
      );
    }

    if (!running.isPaused) {
      throw new ApiError(
        409,
        ErrorCodes.TIMER_NOT_PAUSED,
        'The timer is not paused'
      );
    }

    const resumedAt = data.resumedAt
      ? parseDate(data.resumedAt, 'Resumed time')
      : new Date();

    await timeEntryRepository.update(running.id, {
      isPaused: false,
      pausedAt: null,
      lastResumedAt: resumedAt
    });

    return buildRunningEntryResponse(running.id, running.workspaceId);
  },

  async updateEntry(
    workspaceId: string,
    userId: string,
    entryId: string,
    data: LinkInput & {startTime?: string; endTime?: string}
  ) {
    const entry = await timeEntryRepository.findByIdForUser(
      entryId,
      workspaceId,
      userId
    );

    if (!entry) {
      throw new ApiError(
        404,
        ErrorCodes.TIME_ENTRY_NOT_FOUND,
        'Time entry not found in this workspace'
      );
    }

    // Allow updating metadata even if running, but not time fields
    const hasTimeChanges = data.startTime !== undefined || data.endTime !== undefined;

    if (entry.isRunning && hasTimeChanges) {
      throw new ApiError(
        409,
        ErrorCodes.TIME_ENTRY_RUNNING,
        'Stop the timer before editing time fields'
      );
    }

    const links = await resolveLinks(workspaceId, {
      projectId:
        data.projectId !== undefined
          ? data.projectId
          : (entry.projectId ?? null),
      taskId: data.taskId !== undefined ? data.taskId : (entry.taskId ?? null),
      tagIds: data.tagIds !== undefined ? data.tagIds : entry.tagIds
    });

    const startTime = data.startTime
      ? parseDate(data.startTime, 'Start time')
      : entry.startTime;
    const endTime = data.endTime
      ? parseDate(data.endTime, 'End time')
      : (entry.endTime ?? new Date());
    const timesChanged =
      startTime.getTime() !== entry.startTime.getTime() ||
      !entry.endTime ||
      endTime.getTime() !== entry.endTime.getTime();
    const durationSeconds = timesChanged
      ? computeDuration(startTime, endTime)
      : Math.max(1, entry.durationSeconds);

    await timeEntryRepository.update(entryId, {
      projectId: links.projectId,
      taskId: links.taskId,
      tagIds: links.tagIds,
      description:
        data.description !== undefined
          ? data.description
          : (entry.description ?? null),
      startTime,
      endTime,
      durationSeconds
    });

    const updated = await timeEntryRepository.findByIdInWorkspace(
      entryId,
      workspaceId
    );

    if (!updated) {
      throw new ApiError(
        404,
        ErrorCodes.TIME_ENTRY_NOT_FOUND,
        'Time entry not found in this workspace'
      );
    }

    const lookup = await buildLookup(workspaceId);
    return toTimeEntryDto(updated, lookup);
  },

  async deleteEntry(
    workspaceId: string,
    userId: string,
    entryId: string
  ): Promise<void> {
    const entry = await timeEntryRepository.findByIdForUser(
      entryId,
      workspaceId,
      userId
    );

    if (!entry) {
      throw new ApiError(
        404,
        ErrorCodes.TIME_ENTRY_NOT_FOUND,
        'Time entry not found in this workspace'
      );
    }

    if (entry.isRunning) {
      throw new ApiError(
        409,
        ErrorCodes.TIME_ENTRY_RUNNING,
        'Stop the timer before deleting this entry'
      );
    }

    await timeEntryRepository.delete(entryId);
  }
};
