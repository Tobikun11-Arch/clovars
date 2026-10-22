import mongoose, {Schema} from 'mongoose';

export interface TimeEntryDocument extends mongoose.Document {
  workspaceId: string;
  userId: string;
  projectId?: string | null;
  taskId?: string | null;
  tagIds: string[];
  description?: string | null;
  startTime: Date;
  endTime?: Date | null;
  durationSeconds: number;
  isRunning: boolean;
  isPaused: boolean;
  pausedAt?: Date | null;
  lastResumedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const TimeEntrySchema = new Schema<TimeEntryDocument>(
  {
    workspaceId: {type: String, required: true, index: true},
    userId: {type: String, required: true},
    projectId: {type: String, default: null, index: true},
    taskId: {type: String, default: null, index: true},
    tagIds: {type: [String], default: []},
    description: {type: String, trim: true, maxlength: 500, default: null},
    startTime: {type: Date, required: true},
    endTime: {type: Date, default: null},
    durationSeconds: {type: Number, default: 0, min: 0},
    isRunning: {type: Boolean, default: false},
    isPaused: {type: Boolean, default: false},
    pausedAt: {type: Date, default: null},
    lastResumedAt: {type: Date, default: null}
  },
  {timestamps: true}
);

TimeEntrySchema.index({workspaceId: 1, userId: 1, startTime: -1});
TimeEntrySchema.index({workspaceId: 1, startTime: -1});

// A user can only have one running timer at a time.
TimeEntrySchema.index(
  {userId: 1},
  {unique: true, partialFilterExpression: {isRunning: true}}
);

export const TimeEntryModel = mongoose.model<TimeEntryDocument>(
  'TimeEntry',
  TimeEntrySchema,
  'time_entries'
);
