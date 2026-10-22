import mongoose, {Schema} from 'mongoose';

export interface ProjectDocument extends mongoose.Document {
  workspaceId: string;
  clientId?: string | null;
  name: string;
  color?: string | null;
  archived: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const ProjectSchema = new Schema<ProjectDocument>(
  {
    workspaceId: {type: String, required: true, index: true},
    clientId: {type: String, default: null, index: true},
    name: {type: String, required: true, trim: true, maxlength: 80},
    color: {type: String, trim: true, default: null},
    archived: {type: Boolean, default: false},
    createdBy: {type: String, required: true}
  },
  {timestamps: true}
);

ProjectSchema.index({workspaceId: 1, name: 1}, {unique: true});

export const ProjectModel = mongoose.model<ProjectDocument>(
  'Project',
  ProjectSchema,
  'projects'
);
