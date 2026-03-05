import { Schema, model, Document, Types } from 'mongoose';

export type TaskStatus = 'pending' | 'running' | 'done' | 'failed' | 'cancelled';
export type TaskOrigin = 'user' | 'agent';

export interface ITask extends Document {
  userId: Types.ObjectId;
  agentId: Types.ObjectId;
  objectiveId?: Types.ObjectId;
  title: string;
  description: string;
  origin: TaskOrigin;
  status: TaskStatus;
  schedule?: {
    runAt?: Date;
    cronExpression?: string;
    lastRunAt?: Date;
    nextRunAt?: Date;
    maxRuns?: number;
    runCount: number;
  };
  context?: string;
  tools: string[];
  memoryKeys: string[];
  result?: {
    summary: string;
    completedAt: Date;
    durationMs: number;
    toolsUsed: string[];
  };
  error?: {
    message: string;
    failedAt: Date;
    retryCount: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const TaskSchema = new Schema<ITask>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    agentId: { type: Schema.Types.ObjectId, ref: 'Agent', required: true, index: true },
    objectiveId: { type: Schema.Types.ObjectId, ref: 'Objective', index: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    origin: { type: String, enum: ['user', 'agent'], required: true },
    status: {
      type: String,
      enum: ['pending', 'running', 'done', 'failed', 'cancelled'],
      default: 'pending',
      index: true,
    },
    schedule: {
      runAt: Date,
      cronExpression: String,
      lastRunAt: Date,
      nextRunAt: Date,
      maxRuns: Number,
      runCount: { type: Number, default: 0 },
    },
    context: String,
    tools: [{ type: String }],
    memoryKeys: [{ type: String }],
    result: { summary: String, completedAt: Date, durationMs: Number, toolsUsed: [String] },
    error: { message: String, failedAt: Date, retryCount: { type: Number, default: 0 } },
  },
  { timestamps: true },
);

TaskSchema.index({ userId: 1, status: 1, 'schedule.nextRunAt': 1 });

export const Task = model<ITask>('Task', TaskSchema);
