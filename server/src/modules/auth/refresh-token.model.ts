import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose';

const refreshTokenSchema = new Schema(
  {
    hospitalId: { type: Schema.Types.ObjectId, required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    familyId: { type: String, required: true },
    tokenHash: { type: String, required: true, unique: true, select: false },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date },
    replacedBy: { type: Schema.Types.ObjectId, ref: 'RefreshToken' },
  },
  { timestamps: true, strict: 'throw' },
);

refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
refreshTokenSchema.index({ hospitalId: 1, userId: 1, familyId: 1, revokedAt: 1 });

export type RefreshTokenRecord = InferSchemaType<typeof refreshTokenSchema>;
export const RefreshTokenModel = (mongoose.models.RefreshToken as Model<RefreshTokenRecord> | undefined)
  ?? mongoose.model<RefreshTokenRecord>('RefreshToken', refreshTokenSchema);
