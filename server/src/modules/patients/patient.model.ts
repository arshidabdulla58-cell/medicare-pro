import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose';

const patientSchema = new Schema(
  {
    hospitalId: { type: Schema.Types.ObjectId, required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    patientNumber: { type: String, required: true, immutable: true },
    firstName: { type: String, required: true, trim: true, maxlength: 60 },
    lastName: { type: String, required: true, trim: true, maxlength: 60 },
    phone: { type: String, trim: true, maxlength: 30 },
    email: { type: String, trim: true, lowercase: true, maxlength: 254 },
    dateOfBirth: { type: Date },
    gender: { type: String, enum: ['FEMALE', 'MALE', 'NON_BINARY', 'UNDISCLOSED'] },
    bloodGroup: { type: String, enum: ['A_POSITIVE', 'A_NEGATIVE', 'B_POSITIVE', 'B_NEGATIVE', 'AB_POSITIVE', 'AB_NEGATIVE', 'O_POSITIVE', 'O_NEGATIVE', 'UNKNOWN'] },
    allergies: { type: [String], default: [] },
    emergencyContact: {
      name: { type: String, trim: true, maxlength: 120 },
      relationship: { type: String, trim: true, maxlength: 60 },
      phone: { type: String, trim: true, maxlength: 30 },
    },
    status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },
  },
  { timestamps: true, strict: 'throw' },
);

patientSchema.index({ hospitalId: 1, patientNumber: 1 }, { unique: true });
patientSchema.index({ hospitalId: 1, userId: 1 }, { unique: true, partialFilterExpression: { userId: { $exists: true } } });
patientSchema.index({ hospitalId: 1, lastName: 1, firstName: 1 });

export type PatientRecord = InferSchemaType<typeof patientSchema>;
export const PatientModel = (mongoose.models.Patient as Model<PatientRecord> | undefined)
  ?? mongoose.model<PatientRecord>('Patient', patientSchema);
