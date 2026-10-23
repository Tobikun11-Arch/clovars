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

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader(
        'Content-Disposition',
        'attachment; filename="clovars-report.csv"'
      );
      res.status(200).send(csv);
    } catch (error) {
      next(error);
    }
  }
};