import { Objective, IObjective } from '@librechat/data-schemas';
import { Types } from 'mongoose';

export const getObjectives = async (userId: string, filters?: { status?: string }) => {
    const query: any = { userId: new Types.ObjectId(userId) };
    if (filters?.status) {
        query.status = filters.status;
    }
    return await Objective.find(query).sort({ createdAt: -1 }).lean();
};

export const getObjectiveById = async (userId: string, objectiveId: string) => {
    return await Objective.findOne({
        _id: new Types.ObjectId(objectiveId),
        userId: new Types.ObjectId(userId),
    }).lean();
};

export const createObjective = async (userId: string, data: Partial<IObjective>) => {
    const objective = new Objective({
        ...data,
        userId: new Types.ObjectId(userId),
    });
    return await objective.save();
};

export const updateObjective = async (userId: string, objectiveId: string, data: Partial<IObjective>) => {
    return await Objective.findOneAndUpdate(
        { _id: new Types.ObjectId(objectiveId), userId: new Types.ObjectId(userId) },
        { $set: data },
        { new: true }
    ).lean();
};

export const deleteObjective = async (userId: string, objectiveId: string) => {
    const result = await Objective.deleteOne({
        _id: new Types.ObjectId(objectiveId),
        userId: new Types.ObjectId(userId),
    });
    return result.deletedCount > 0;
};
