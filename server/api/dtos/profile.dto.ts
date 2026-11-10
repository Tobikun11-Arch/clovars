import {z} from 'zod';

// Raw base64 can encode at most this many bytes of image data.
export const MAX_AVATAR_BYTES = 200 * 1024;

const AVATAR_DATA_URL = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/;

export const updateProfileDto = z.object({
  firstName: z.string().trim().min(1, 'First name is required').max(60),
  lastName: z.string().trim().min(1, 'Last name is required').max(60),
  username: z
    .string()
    .trim()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username must be at most 30 characters')
    .regex(
      /^[A-Za-z0-9._-]+$/,
      'Username may only contain letters, numbers, dots, dashes and underscores'
    )
});

export const updateAvatarDto = z.object({
  avatar: z
    .string()
    .regex(AVATAR_DATA_URL, 'Photo must be a PNG, JPEG or WebP image')
    // base64 inflates size by 4/3; allow a little room for the data URL prefix
    .max(Math.ceil((MAX_AVATAR_BYTES * 4) / 3) + 64, 'Photo must be 200 KB or smaller')
});

export type UpdateProfileDto = z.infer<typeof updateProfileDto>;
export type UpdateAvatarDto = z.infer<typeof updateAvatarDto>;
