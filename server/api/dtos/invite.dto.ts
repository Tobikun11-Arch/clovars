import {z} from 'zod';

export const createInviteDto = z.object({
  email: z
    .string()
    .email('A valid email is required')
    .optional()
    .or(z.literal('').transform(() => undefined)),
  role: z.enum(['admin', 'member']).default('member')
});

export const acceptInviteDto = z.object({
  code: z.string().min(4, 'Invite code is required').max(32)
});

export type CreateInviteDto = z.infer<typeof createInviteDto>;
export type AcceptInviteDto = z.infer<typeof acceptInviteDto>;
