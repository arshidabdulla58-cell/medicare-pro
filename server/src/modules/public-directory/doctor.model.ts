import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose';

const doctorSchema = new Schema(
  {
    hospitalId: { type: Schema.Types.ObjectId, required: true, index: true },
    displayName: { type: String, required: true, trim: true, maxlength: 100 },
    specialty: { type: String, required: true, trim: true, maxlength: 100 },
    departmentId: { type: Schema.Types.ObjectId, ref: 'Department' },
    qualification: { type: String, required: true, trim: true, maxlength: 160 },
    experienceYears: { type: Number, required: true, min: 0, max: 80 },
    biography: { type: String, trim: true, maxlength: 600 },
    availabilityTimeZone: { type: String, required: true, default: 'UTC', maxlength: 64 },
    weeklyAvailability: [{
      dayOfWeek: { type: Number, required: true, min: 0, max: 6 },
      startTime: { type: String, required: true, match: /^([01]\d|2[0-3]):[0-5]\d$/ },
      endTime: { type: String, required: true, match: /^([01]\d|2[0-3]):[0-5]\d$/ },
    }],
    isPublic: { type: Boolean, default: false },
    status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },
  },
  { timestamps: true, strict: 'throw' },
);

doctorSchema.index({ hospitalId: 1, isPublic: 1, status: 1, displayName: 1 });

type Doctor = InferSchemaType<typeof doctorSchema>;
export const DoctorModel = (mongoose.models.Doctor as Model<Doctor> | undefined)
  ?? mongoose.model<Doctor>('Doctor', doctorSchema);
