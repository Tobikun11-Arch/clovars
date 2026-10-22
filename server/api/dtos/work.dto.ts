import {z} from 'zod';

const colorSchema = z
  .string()
  .regex(
    /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/,
    'Color must be a hex value like #4fc3f7'
  );

export const createClientDto = z.object({
  name: z.string().trim().min(1, 'Client name is required').max(80),
  notes: z.string().trim().max(500).nullable().optional(),
  color: colorSchema.nullable().optional()
});

export const updateClientDto = z
  .object({
    name: z.string().trim().min(1, 'Client name is required').max(80).optional(),
    notes: z.string().trim().max(500).nullable().optional(),
    color: colorSchema.nullable().optional()
  })
  .refine(data => Object.keys(data).length > 0, {
    message: 'At least one field is required'
  });

export const createProjectDto = z.object({
  name: z.string().trim().min(1, 'Project name is required').max(80),
  clientId: z.string().min(1).nullable().optional(),
  color: colorSchema.nullable().optional(),
  archived: z.boolean().optional()
});

export const updateProjectDto = z
  .object({
    name: z.string().trim().min(1, 'Project name is required').max(80).optional(),
    clientId: z.string().min(1).nullable().optional(),
    color: colorSchema.nullable().optional(),
    archived: z.boolean().optional()
  })
  .refine(data => Object.keys(data).length > 0, {
    message: 'At least one field is required'
  });

export const createTaskDto = z.object({
  name: z.string().trim().min(1, 'Task name is required').max(120),
  projectId: z.string().min(1, 'Project is required'),
  description: z.string().trim().max(1000).nullable().optional(),
  archived: z.boolean().optional()
});

export const updateTaskDto = z
  .object({
    name: z.string().trim().min(1, 'Task name is required').max(120).optional(),
    projectId: z.string().min(1).optional(),
    description: z.string().trim().max(1000).nullable().optional(),
    archived: z.boolean().optional()
  })
  .refine(data => Object.keys(data).length > 0, {
    message: 'At least one field is required'
  });

export const createTagDto = z.object({
  name: z.string().trim().min(1, 'Tag name is required').max(40),
  color: colorSchema.nullable().optional()
});

export const updateTagDto = z
  .object({
    name: z.string().trim().min(1, 'Tag name is required').max(40).optional(),
    color: colorSchema.optional()
  })
  .refine(data => Object.keys(data).length > 0, {
    message: 'At least one field is required'
  });

export type CreateClientDto = z.infer<typeof createClientDto>;
export type UpdateClientDto = z.infer<typeof updateClientDto>;
export type CreateProjectDto = z.infer<typeof createProjectDto>;
export type UpdateProjectDto = z.infer<typeof updateProjectDto>;
export type CreateTaskDto = z.infer<typeof createTaskDto>;
export type UpdateTaskDto = z.infer<typeof updateTaskDto>;
export type CreateTagDto = z.infer<typeof createTagDto>;
export type UpdateTagDto = z.infer<typeof updateTagDto>;
