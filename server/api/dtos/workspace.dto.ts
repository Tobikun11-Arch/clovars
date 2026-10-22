import {z} from 'zod';

export const createWorkspaceDto = z.object({
  name: z.string().min(1, 'Workspace name is required').max(80)
});

export const updateWorkspaceDto = z.object({
  name: z.string().min(1, 'Workspace name is required').max(80)
});

export const updateMemberRoleDto = z.object({
  role: z.enum(['admin', 'member'])
});

export type CreateWorkspaceDto = z.infer<typeof createWorkspaceDto>;
export type UpdateWorkspaceDto = z.infer<typeof updateWorkspaceDto>;
export type UpdateMemberRoleDto = z.infer<typeof updateMemberRoleDto>;
