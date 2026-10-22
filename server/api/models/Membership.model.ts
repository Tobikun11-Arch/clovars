import mongoose, {Schema} from 'mongoose';

export const WORKSPACE_ROLES = ['owner', 'admin', 'member'] as const;

export type WorkspaceRole = (typeof WORKSPACE_ROLES)[number];

export interface MembershipDocument extends mongoose.Document {
  workspaceId: string;
  userId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: WorkspaceRole;
  createdAt: Date;
  updatedAt: Date;
}

const MembershipSchema = new Schema<MembershipDocument>(
  {
    workspaceId: {type: String, required: true, index: true},
    userId: {type: String, required: true, index: true},
    email: {type: String, required: true, lowercase: true, trim: true},
    firstName: {type: String, trim: true},
    lastName: {type: String, trim: true},
    role: {type: String, required: true, enum: WORKSPACE_ROLES, default: 'member'}
  },
  {timestamps: true}
);

MembershipSchema.index({workspaceId: 1, userId: 1}, {unique: true});

export const MembershipModel = mongoose.model<MembershipDocument>(
  'Membership',
  MembershipSchema,
  'memberships'
);
