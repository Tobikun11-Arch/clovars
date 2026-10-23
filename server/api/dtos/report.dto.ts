import {z} from 'zod';

const dateRefine = (value: string) => !Number.isNaN(Date.parse(value));

export const reportQueryDto = z.object({
  from: z.string().refine(dateRefine, 'Invalid date').optional(),
  to: z.string().refine(dateRefine, 'Invalid date').optional(),
  projectId: z.string().min(1).optional(),
  tagId: z.string().min(1).optional(),
  memberId: z.string().min(1).optional(),
  groupBy: z.enum(['project', 'member', 'date']).default('date'),
  limit: z.coerce.number().int().positive().max(100000).optional(),
  timezoneOffset: z.coerce.number().int().optional()
});

export type ReportQuery = z.infer<typeof reportQueryDto>;
export type ReportGroupBy = z.infer<typeof reportQueryDto>['groupBy'];