import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose';

const appointmentSchema = new Schema({
  hospitalId: { type: Schema.Types.ObjectId, required: true },
  patientId: { type: Schema.Types.ObjectId, ref: 'Patient', required: true },
  doctorId: { type: Schema.Types.ObjectId, ref: 'Doctor', required: true },
  startsAt: { type: Date, required: true },
  endsAt: { type: Date, required: true },
  timeZone: { type: String, required: true, maxlength: 64 },
  status: { type: String, enum: ['PENDING', 'CONFIRMED', 'CHECKED_IN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW'], default: 'PENDING', required: true },
  reason: { type: String, trim: true, maxlength: 500 },
  createdById: { type: Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true, strict: 'throw', collection: 'appointments' });

appointmentSchema.index({ hospitalId: 1, startsAt: 1 });
appointmentSchema.index({ hospitalId: 1, patientId: 1, startsAt: -1 });
appointmentSchema.index({ hospitalId: 1, doctorId: 1, startsAt: 1 });

const appointmentSlotSchema = new Schema({
  hospitalId: { type: Schema.Types.ObjectId, required: true },
  doctorId: { type: Schema.Types.ObjectId, ref: 'Doctor', required: true },
  startsAt: { type: Date, required: true },
  appointmentId: { type: Schema.Types.ObjectId, ref: 'Appointment', required: true },
}, { timestamps: true, strict: 'throw', collection: 'appointmentSlots' });
appointmentSlotSchema.index({ hospitalId: 1, doctorId: 1, startsAt: 1 }, { unique: true });

export type AppointmentRecord = InferSchemaType<typeof appointmentSchema>;
type AppointmentSlot = InferSchemaType<typeof appointmentSlotSchema>;
export const AppointmentModel = (mongoose.models.Appointment as Model<AppointmentRecord> | undefined) ?? mongoose.model<AppointmentRecord>('Appointment', appointmentSchema);
export const AppointmentSlotModel = (mongoose.models.AppointmentSlot as Model<AppointmentSlot> | undefined) ?? mongoose.model<AppointmentSlot>('AppointmentSlot', appointmentSlotSchema);
