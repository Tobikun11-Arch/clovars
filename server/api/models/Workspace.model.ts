import mongoose, {Schema} from 'mongoose';

export interface WorkspaceDocument extends mongoose.Document {
  name: string;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
}

const WorkspaceSchema = new Schema<WorkspaceDocument>(
  {
    name: {type: String, required: true, trim: true, maxlength: 80},
    ownerId: {type: String, required: true, index: true}
  },
  {timestamps: true}
);

export const WorkspaceModel = mongoose.model<WorkspaceDocument>(
  'Workspace',
  WorkspaceSchema,
  'workspaces'
);
