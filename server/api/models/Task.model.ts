import mongoose, {Schema} from 'mongoose';

export interface TaskDocument extends mongoose.Document {
  workspaceId: string;
  projectId: string;
  name: string;
  description?: string | null;
  archived: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const TaskSchema = new Schema<TaskDocument>(
  {
    workspaceId: {type: String, required: true, index: true},
    projectId: {type: String, required: true, index: true},
    name: {type: String, required: true, trim: true, maxlength: 120},
    description: {type: String, trim: true, maxlength: 1000, default: null},
    archived: {type: Boolean, default: false},
    createdBy: {type: String, required: true}
  },
  {timestamps: true}
);

TaskSchema.index({workspaceId: 1, projectId: 1, name: 1});

export const TaskModel = mongoose.model<TaskDocument>(
  'Task',
  TaskSchema,
  'tasks'
);
