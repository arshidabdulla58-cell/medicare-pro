import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose';

const auditLogSchema = new Schema(
  {
    hospitalId: { type: Schema.Types.ObjectId, required: true },
    actorId: { type: Schema.Types.ObjectId, ref: 'User' },
    action: { type: String, required: true, maxlength: 80 },
    resourceType: { type: String, required: true, maxlength: 60 },
    resourceId: { type: Schema.Types.ObjectId },
    requestId: { type: String, maxlength: 100 },
    timestamp: { type: Date, required: true, default: Date.now, immutable: true },
    metadata: { type: Schema.Types.Mixed, default: undefined, select: false },
  },
  { timestamps: false, strict: 'throw' },
);

auditLogSchema.index({ hospitalId: 1, actorId: 1, timestamp: -1 });
auditLogSchema.index({ hospitalId: 1, timestamp: -1, _id: -1 });
auditLogSchema.index({ hospitalId: 1, resourceType: 1, resourceId: 1, timestamp: -1 });

export type AuditLogRecord = InferSchemaType<typeof auditLogSchema>;
export const AuditLogModel = (mongoose.models.AuditLog as Model<AuditLogRecord> | undefined)
  ?? mongoose.model<AuditLogRecord>('AuditLog', auditLogSchema);
