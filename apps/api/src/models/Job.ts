import mongoose, { Schema, Document } from 'mongoose';

export interface IJob extends Document {
  title: string;
  description: string;
  company: string;
  employerId: mongoose.Types.ObjectId;
  location: string;
  salary: {
    min: number;
    max: number;
    currency: string;
  };
  category: string;
  experienceLevel: 'Entry' | 'Intermediate' | 'Senior' | 'Lead';
  employmentType: 'Full-time' | 'Part-time' | 'Contract' | 'Internship';
  remote: boolean;
  requirements: string[];
  responsibilities: string[];
  benefits: string[];
  applicationDeadline: Date;
  status: 'active' | 'closed' | 'draft';
  views: number;
  applicationsCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const JobSchema: Schema = new Schema({
  title: { type: String, required: true, index: true },
  description: { type: String, required: true },
  company: { type: String, required: true },
  employerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  location: { type: String, required: true },
  salary: {
    min: { type: Number, required: true },
    max: { type: Number, required: true },
    currency: { type: String, default: 'USD' }
  },
  category: { type: String, required: true, index: true },
  experienceLevel: { 
    type: String, 
    enum: ['Entry', 'Intermediate', 'Senior', 'Lead'],
    required: true 
  },
  employmentType: {
    type: String,
    enum: ['Full-time', 'Part-time', 'Contract', 'Internship'],
    required: true
  },
  remote: { type: Boolean, default: false },
  requirements: [{ type: String }],
  responsibilities: [{ type: String }],
  benefits: [{ type: String }],
  applicationDeadline: { type: Date, required: true },
  status: { 
    type: String, 
    enum: ['active', 'closed', 'draft'],
    default: 'active' 
  },
  views: { type: Number, default: 0 },
  applicationsCount: { type: Number, default: 0 }
}, {
  timestamps: true
});

// Create indexes for search functionality
JobSchema.index({ title: 'text', description: 'text' });
JobSchema.index({ location: 1, category: 1, experienceLevel: 1, remote: 1 });

export default mongoose.model<IJob>('Job', JobSchema);