import mongoose, {Schema} from 'mongoose';

export const INVITE_STATUSES = ['pending', 'accepted', 'revoked'] as const;

export type InviteStatus = (typeof INVITE_STATUSES)[number];

export interface InviteDocument extends mongoose.Document {
  workspaceId: string;
  email?: string | null;
  code: string;
  role: 'admin' | 'member';
  createdBy: string;
  status: InviteStatus;
  expiresAt: Date;
  acceptedBy?: string | null;
  acceptedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const InviteSchema = new Schema<InviteDocument>(
  {
    workspaceId: {type: String, required: true, index: true},
    email: {type: String, lowercase: true, trim: true, default: null},
    code: {type: String, required: true, unique: true, index: true},
    role: {type: String, required: true, enum: ['admin', 'member'], default: 'member'},
    createdBy: {type: String, required: true},
    status: {type: String, required: true, enum: INVITE_STATUSES, default: 'pending'},
    expiresAt: {type: Date, required: true},
    acceptedBy: {type: String, default: null},
    acceptedAt: {type: Date, default: null}
  },
  {timestamps: true}
);

InviteSchema.index({workspaceId: 1, email: 1, status: 1});

export const InviteModel = mongoose.model<InviteDocument>(
  'Invite',
  InviteSchema,
  'invites'
);
