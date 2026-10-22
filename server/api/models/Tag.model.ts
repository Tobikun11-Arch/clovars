import mongoose, {Schema} from 'mongoose';

export interface TagDocument extends mongoose.Document {
  workspaceId: string;
  name: string;
  color: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const TagSchema = new Schema<TagDocument>(
  {
    workspaceId: {type: String, required: true, index: true},
    name: {type: String, required: true, trim: true, maxlength: 40},
    color: {type: String, required: true, trim: true, default: '#4fc3f7'},
    createdBy: {type: String, required: true}
  },
  {timestamps: true}
);

TagSchema.index({workspaceId: 1, name: 1}, {unique: true});

export const TagModel = mongoose.model<TagDocument>('Tag', TagSchema, 'tags');
