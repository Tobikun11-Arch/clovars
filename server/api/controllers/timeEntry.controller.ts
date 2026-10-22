import {Request, Response, NextFunction} from 'express';
import {timeEntryService} from '../services/timeEntry.service';
import {getActor} from '../utils/actor';
import {ApiError} from '../utils/error';
import {ErrorCodes} from '../constants/errorCodes';

function getQueryString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function parseDateQuery(
  value: string | undefined,
  field: string
): Date | undefined {
  if (!value) return undefined;

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

function parseLimit(value: unknown): number {
  if (typeof value !== 'string') return 100;

  const parsed = Number.parseInt(value, 10);

  if (Number.isNaN(parsed) || parsed <= 0) return 100;

  return Math.min(parsed, 500);
}

export const timeEntryController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const actor = await getActor(req);
      const entries = await timeEntryService.list(
        req.params.workspaceId,
        actor.userId,
        {
          from: parseDateQuery(getQueryString(req.query.from), 'From date'),
          to: parseDateQuery(getQueryString(req.query.to), 'To date'),
          projectId: getQueryString(req.query.projectId),
          taskId: getQueryString(req.query.taskId),
          limit: parseLimit(req.query.limit)
        }
      );

      res.status(200).json({entries});
    } catch (error) {
      next(error);
    }
  },

  async running(req: Request, res: Response, next: NextFunction) {
    try {
      const actor = await getActor(req);
      const entry = await timeEntryService.getRunning(
        req.params.workspaceId,
        actor.userId
      );

      res.status(200).json({entry});
    } catch (error) {
      next(error);
    }
  },

  async get(req: Request, res: Response, next: NextFunction) {
    try {
      const actor = await getActor(req);
      const entry = await timeEntryService.getEntry(
        req.params.workspaceId,
        actor.userId,
        req.params.entryId
      );

      res.status(200).json({entry});
    } catch (error) {
      next(error);
    }
  },

  async globalRunning(req: Request, res: Response, next: NextFunction) {
    try {
      const actor = await getActor(req);
      const entry = await timeEntryService.getGlobalRunning(actor.userId);

      res.status(200).json({entry});
    } catch (error) {
      next(error);
    }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const actor = await getActor(req);
      const entry = await timeEntryService.createManualEntry(
        req.params.workspaceId,
        actor.userId,
        req.body
      );

      res.status(201).json({entry});
    } catch (error) {
      next(error);
    }
  },

  async start(req: Request, res: Response, next: NextFunction) {
    try {
      const actor = await getActor(req);
      const entry = await timeEntryService.startTimer(
        req.params.workspaceId,
        actor.userId,
        req.body
      );

      res.status(201).json({entry});
    } catch (error) {
      next(error);
    }
  },

  async stop(req: Request, res: Response, next: NextFunction) {
    try {
      const actor = await getActor(req);
      const entry = await timeEntryService.stopTimer(actor.userId, req.body);

      res.status(200).json({entry});
    } catch (error) {
      next(error);
    }
  },

  async pause(req: Request, res: Response, next: NextFunction) {
    try {
      const actor = await getActor(req);
      const entry = await timeEntryService.pauseTimer(actor.userId, req.body);

      res.status(200).json({entry});
    } catch (error) {
      next(error);
    }
  },

  async resume(req: Request, res: Response, next: NextFunction) {
    try {
      const actor = await getActor(req);
      const entry = await timeEntryService.resumeTimer(actor.userId, req.body);

      res.status(200).json({entry});
    } catch (error) {
      next(error);
    }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const actor = await getActor(req);
      const entry = await timeEntryService.updateEntry(
        req.params.workspaceId,
        actor.userId,
        req.params.entryId,
        req.body
      );

      res.status(200).json({entry});
    } catch (error) {
      next(error);
    }
  },

  async remove(req: Request, res: Response, next: NextFunction) {
    try {
      const actor = await getActor(req);
      await timeEntryService.deleteEntry(
        req.params.workspaceId,
        actor.userId,
        req.params.entryId
      );

      res.status(200).json({message: 'Time entry deleted'});
    } catch (error) {
      next(error);
    }
  }
};
