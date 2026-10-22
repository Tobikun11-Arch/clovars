import mongoose, {Schema} from 'mongoose';

export interface ClientDocument extends mongoose.Document {
  workspaceId: string;
  name: string;
  notes?: string | null;
  color?: string | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const ClientSchema = new Schema<ClientDocument>(
  {
    workspaceId: {type: String, required: true, index: true},
    name: {type: String, required: true, trim: true, maxlength: 80},
    notes: {type: String, trim: true, maxlength: 500, default: null},
    color: {type: String, trim: true, default: null},
    createdBy: {type: String, required: true}
  },
  {timestamps: true}
);

ClientSchema.index({workspaceId: 1, name: 1}, {unique: true});

export const ClientModel = mongoose.model<ClientDocument>(
  'Client',
  ClientSchema,
  'clients'
);
