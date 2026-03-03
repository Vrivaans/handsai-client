import { Task, ITask, TaskStatus } from '@librechat/data-schemas';
import { Types } from 'mongoose';

export const getTasks = async (userId: string, filters?: { status?: TaskStatus; objectiveId?: string }) => {
    const query: any = { userId: new Types.ObjectId(userId) };
    if (filters?.status) {
        query.status = filters.status;
    }
    if (filters?.objectiveId) {
        query.objectiveId = new Types.ObjectId(filters.objectiveId);
    }
    return await Task.find(query).sort({ createdAt: -1 }).lean();
};

export const getTaskById = async (userId: string, taskId: string) => {
    return await Task.findOne({
        _id: new Types.ObjectId(taskId),
        userId: new Types.ObjectId(userId),
    }).lean();
};

export const createTask = async (userId: string, data: Partial<ITask>) => {
    const task = new Task({
        ...data,
        userId: new Types.ObjectId(userId),
        status: data.status || 'pending',
    });
    return await task.save();
};

export const updateTask = async (userId: string, taskId: string, data: Partial<ITask>) => {
    return await Task.findOneAndUpdate(
        { _id: new Types.ObjectId(taskId), userId: new Types.ObjectId(userId) },
        { $set: data },
        { new: true }
    ).lean();
};

export const deleteTask = async (userId: string, taskId: string) => {
    const result = await Task.deleteOne({
        _id: new Types.ObjectId(taskId),
        userId: new Types.ObjectId(userId),
    });
    return result.deletedCount > 0;
};
