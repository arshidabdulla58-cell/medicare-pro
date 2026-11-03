import mongoose, { Schema } from 'mongoose';

const contactMessageSchema = new Schema(
  {
    hospitalId: { type: Schema.Types.ObjectId, required: true, index: true },
    reference: { type: String, required: true, unique: true, immutable: true },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 254 },
    phone: { type: String, trim: true, maxlength: 30 },
    topic: { type: String, enum: ['GENERAL', 'APPOINTMENT', 'FEEDBACK'], required: true },
    message: { type: String, required: true, trim: true, maxlength: 2000 },
    status: { type: String, enum: ['NEW', 'IN_REVIEW', 'CLOSED'], default: 'NEW' },
  },
  { timestamps: true, strict: 'throw' },
);

contactMessageSchema.index({ hospitalId: 1, status: 1, createdAt: -1 });

export const ContactMessageModel = mongoose.models.ContactMessage ?? mongoose.model('ContactMessage', contactMessageSchema);
