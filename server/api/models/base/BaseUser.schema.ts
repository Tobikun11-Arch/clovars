import mongoose, {Schema} from 'mongoose';

export interface BaseUserDocument extends mongoose.Document {
  firstName: string;
  lastName: string;
  email: string;
  passwordHash: string;
  username?: string;
  avatar?: string | null;
  isVerified: boolean;
  verificationCode?: string | null;
  verificationExpiry?: Date | null;
  resetCode?: string | null;
  resetExpiry?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export function createBaseUserSchema<T extends BaseUserDocument>() {
  const schema = new Schema<T>(
    {
      firstName: {type: String, required: true},
      lastName: {type: String, required: true},
      email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
      },
      passwordHash: {type: String, required: true},
      username: {type: String, unique: true, sparse: true},
      // Profile photo as a small data URL (resized on the client). Excluded from
      // default queries so routine user lookups don't load the image.
      avatar: {type: String, default: null, select: false},
      isVerified: {type: Boolean, default: false},
      verificationCode: {type: String, default: null},
      verificationExpiry: {type: Date, default: null},
      resetCode: {type: String, default: null},
      resetExpiry: {type: Date, default: null}
    },
    {timestamps: true}
  );

  return schema;
}