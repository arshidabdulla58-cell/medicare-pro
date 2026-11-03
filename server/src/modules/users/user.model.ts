import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose';

const roles = ['SUPER_ADMIN', 'ADMIN', 'DOCTOR', 'RECEPTIONIST', 'NURSE', 'PHARMACIST', 'LAB_TECHNICIAN', 'PATIENT'] as const;

const userSchema = new Schema(
  {
    hospitalId: { type: Schema.Types.ObjectId, required: true },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 254 },
    firstName: { type: String, required: true, trim: true, maxlength: 60 },
    lastName: { type: String, required: true, trim: true, maxlength: 60 },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: roles, required: true },
    status: { type: String, enum: ['ACTIVE', 'DISABLED'], default: 'ACTIVE' },
    phone: { type: String, trim: true, maxlength: 30 },
    patientId: { type: Schema.Types.ObjectId, ref: 'Patient' },
    tokenVersion: { type: Number, default: 0 },
    failedLoginCount: { type: Number, default: 0 },
    lockUntil: { type: Date },
    passwordResetTokenHash: { type: String, select: false },
    passwordResetExpiresAt: { type: Date, select: false },
  },
  { timestamps: true, strict: 'throw' },
);

userSchema.index({ hospitalId: 1, email: 1 }, { unique: true });
userSchema.index({ hospitalId: 1, role: 1, status: 1 });
userSchema.index({ hospitalId: 1, role: 1 }, { unique: true, partialFilterExpression: { role: 'SUPER_ADMIN' } });

export type UserRecord = InferSchemaType<typeof userSchema>;
export const UserModel = (mongoose.models.User as Model<UserRecord> | undefined)
  ?? mongoose.model<UserRecord>('User', userSchema);
export const USER_ROLES = roles;
