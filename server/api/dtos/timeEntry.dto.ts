import {z} from 'zod';

const dateString = z
  .string()
  .min(1, 'Date is required')
  .refine((value) => !Number.isNaN(Date.parse(value)), 'Invalid date');

const linkShape = {
  projectId: z.string().min(1).nullable().optional(),
  taskId: z.string().min(1).nullable().optional(),
  tagIds: z.array(z.string().min(1)).max(20).optional(),
  description: z.string().trim().max(500).nullable().optional()
};

export const createTimeEntryDto = z.object({
  ...linkShape,
  startTime: dateString,
  endTime: dateString
});

export const updateTimeEntryDto = z
  .object({
    ...linkShape,
    startTime: dateString.optional(),
    endTime: dateString.optional()
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field is required'
  });

export const startTimerDto = z.object({
  ...linkShape,
  startTime: dateString.optional()
});

export const stopTimerDto = z.object({
  endTime: dateString.optional()
});

export const pauseTimerDto = z.object({
  pausedAt: dateString.optional()
});

export const resumeTimerDto = z.object({
  resumedAt: dateString.optional()
});

export type CreateTimeEntryDto = z.infer<typeof createTimeEntryDto>;
export type UpdateTimeEntryDto = z.infer<typeof updateTimeEntryDto>;
export type StartTimerDto = z.infer<typeof startTimerDto>;
export type StopTimerDto = z.infer<typeof stopTimerDto>;
export type PauseTimerDto = z.infer<typeof pauseTimerDto>;
export type ResumeTimerDto = z.infer<typeof resumeTimerDto>;
