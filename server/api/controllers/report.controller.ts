import {Request, Response, NextFunction} from 'express';
import {reportService} from '../services/report.service';
import {reportQueryDto} from '../dtos/report.dto';
import {getActor} from '../utils/actor';
import {ApiError} from '../utils/error';
import {ErrorCodes} from '../constants/errorCodes';

export const reportController = {
  async summary(req: Request, res: Response, next: NextFunction) {
    try {
      const actor = await getActor(req);
      const parsed = reportQueryDto.safeParse(req.query);

      if (!parsed.success) {
        const flattened = parsed.error.flatten();
        const firstFieldError = Object.values(flattened.fieldErrors)
          .flat()
          .filter(Boolean)[0];
        const firstFormError = flattened.formErrors.filter(Boolean)[0];
        const message =
          firstFieldError ?? firstFormError ?? 'Invalid request';

        throw new ApiError(
          400,
          ErrorCodes.VALIDATION_ERROR,
          message,
          flattened
        );
      }

      const role = (req.membership?.role ?? 'member') as
        | 'owner'
        | 'admin'
        | 'member';

      const result = await reportService.aggregate(
        req.params.workspaceId,
        actor.userId,
        role,
        parsed.data
      );

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  },

  async exportCsv(req: Request, res: Response, next: NextFunction) {
    try {
      const actor = await getActor(req);
      const parsed = reportQueryDto.safeParse(req.query);

      if (!parsed.success) {
        const flattened = parsed.error.flatten();
        const firstFieldError = Object.values(flattened.fieldErrors)
          .flat()
          .filter(Boolean)[0];
        const firstFormError = flattened.formErrors.filter(Boolean)[0];
        const message =
          firstFieldError ?? firstFormError ?? 'Invalid request';

        throw new ApiError(
          400,
          ErrorCodes.VALIDATION_ERROR,
          message,
          flattened
        );
      }

      const role = (req.membership?.role ?? 'member') as
        | 'owner'
        | 'admin'
        | 'member';

      const result = await reportService.aggregate(
        req.params.workspaceId,
        actor.userId,
        role,
        parsed.data
      );

      const csv = reportService.toCsv(result);

      const safe = (value: string) =>
        String(value)
          .trim()
          .replace(/[^a-zA-Z0-9._-]+/g, '_')
          .replace(/^_+|_+$/g, '') || 'all';
      const fileName = `report_${safe(result.workspaceName)}_${safe(
        result.memberLabel
      )}_${safe(result.dateFrom || 'all')}_to_${safe(
        result.dateTo || 'all'
      )}_by-${safe(result.groupBy.toLowerCase())}.csv`;

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.status(200).send(csv);
    } catch (error) {
      next(error);
    }
  },

  async exportDetailedCsv(req: Request, res: Response, next: NextFunction) {
    try {
      const actor = await getActor(req);
      const parsed = reportQueryDto.safeParse(req.query);

      if (!parsed.success) {
        const flattened = parsed.error.flatten();
        const firstFieldError = Object.values(flattened.fieldErrors)
          .flat()
          .filter(Boolean)[0];
        const firstFormError = flattened.formErrors.filter(Boolean)[0];
        const message =
          firstFieldError ?? firstFormError ?? 'Invalid request';

        throw new ApiError(
          400,
          ErrorCodes.VALIDATION_ERROR,
          message,
          flattened
        );
      }

      const role = (req.membership?.role ?? 'member') as
        | 'owner'
        | 'admin'
        | 'member';

      const csv = await reportService.detailedCsv(
        req.params.workspaceId,
        actor.userId,
        role,
        parsed.data
      );

      const safe = (value: string) =>
        String(value)
          .trim()
          .replace(/[^a-zA-Z0-9._-]+/g, '_')
          .replace(/^_+|_+$/g, '') || 'all';

      const fileName = `report_detailed_${safe(
        parsed.data.from || 'all'
      )}_to_${safe(parsed.data.to || 'all')}.csv`;

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.status(200).send(csv);
    } catch (error) {
      next(error);
    }
  }
};