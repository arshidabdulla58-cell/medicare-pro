import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose';

const departmentSchema = new Schema(
  {
    hospitalId: { type: Schema.Types.ObjectId, required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    slug: { type: String, required: true, trim: true, lowercase: true },
    summary: { type: String, required: true, trim: true, maxlength: 320 },
    iconKey: { type: String, enum: ['heart', 'pulse', 'stethoscope'], default: 'heart' },
    sortOrder: { type: Number, default: 0 },
    isPublic: { type: Boolean, default: false },
    status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },
  },
  { timestamps: true, strict: 'throw' },
);

departmentSchema.index({ hospitalId: 1, slug: 1 }, { unique: true });
departmentSchema.index({ hospitalId: 1, isPublic: 1, status: 1, sortOrder: 1 });

type Department = InferSchemaType<typeof departmentSchema>;
export const DepartmentModel = (mongoose.models.Department as Model<Department> | undefined)
  ?? mongoose.model<Department>('Department', departmentSchema);
