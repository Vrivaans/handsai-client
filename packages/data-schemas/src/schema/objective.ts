import { Schema, model, Document, Types } from 'mongoose';

export interface IObjective extends Document {
  userId: Types.ObjectId;
  title: string;
  description: string;
  status: 'active' | 'paused' | 'closed';
  runner: {
    enabled: boolean;
    cronExpression: string;
    lastRunAt?: Date;
    nextRunAt?: Date;
  };
  memoryKeys: string[];
  tools: string[];
  summary?: string;
  tasksGenerated: number;
  createdAt: Date;
  updatedAt: Date;
  closedAt?: Date;
}

const ObjectiveSchema = new Schema<IObjective>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    status: { type: String, enum: ['active', 'paused', 'closed'], default: 'active', index: true },
    runner: {
      enabled: { type: Boolean, default: true },
      cronExpression: { type: String, default: '0 */6 * * *' },
      lastRunAt: Date,
      nextRunAt: Date,
    },
    memoryKeys: [{ type: String }],
    tools: [{ type: String }],
    summary: String,
    tasksGenerated: { type: Number, default: 0 },
    closedAt: Date,
  },
  { timestamps: true },
);

export const Objective = model<IObjective>('Objective', ObjectiveSchema);
