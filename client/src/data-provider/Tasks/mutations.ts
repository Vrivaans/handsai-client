import { useMutation, useQueryClient } from '@tanstack/react-query';
import { dataService, MutationKeys, QueryKeys } from 'librechat-data-provider';
import type { UseMutationResult } from '@tanstack/react-query';

/**
 * Hook for creating a new Task
 */
export const useCreateTaskMutation = (): UseMutationResult<any, unknown, any, unknown> => {
    const queryClient = useQueryClient();
    return useMutation((payload: any) => dataService.createTask(payload), {
        onSuccess: () => {
            queryClient.invalidateQueries([QueryKeys.tasks]);
        },
    });
};

/**
 * Hook for updating a Task
 */
export const useUpdateTaskMutation = (id: string): UseMutationResult<any, unknown, any, unknown> => {
    const queryClient = useQueryClient();
    return useMutation((payload: any) => dataService.updateTask(id, payload), {
        onSuccess: (updatedTask) => {
            queryClient.setQueryData([QueryKeys.task, id], updatedTask);
            queryClient.invalidateQueries([QueryKeys.tasks]);
        },
    });
};

/**
 * Hook for deleting a Task
 */
export const useDeleteTaskMutation = (): UseMutationResult<void, unknown, string, unknown> => {
    const queryClient = useQueryClient();
    return useMutation((id: string) => dataService.deleteTask(id), {
        onSuccess: () => {
            queryClient.invalidateQueries([QueryKeys.tasks]);
        },
    });
};

/**
 * Hook for creating a new Objective
 */
export const useCreateObjectiveMutation = (): UseMutationResult<any, unknown, any, unknown> => {
    const queryClient = useQueryClient();
    return useMutation((payload: any) => dataService.createObjective(payload), {
        onSuccess: () => {
            queryClient.invalidateQueries([QueryKeys.objectives]);
        },
    });
};

/**
 * Hook for updating an Objective
 */
export const useUpdateObjectiveMutation = (id: string): UseMutationResult<any, unknown, any, unknown> => {
    const queryClient = useQueryClient();
    return useMutation((payload: any) => dataService.updateObjective(id, payload), {
        onSuccess: (updatedObjective) => {
            queryClient.setQueryData([QueryKeys.objective, id], updatedObjective);
            queryClient.invalidateQueries([QueryKeys.objectives]);
        },
    });
};

/**
 * Hook for deleting an Objective
 */
export const useDeleteObjectiveMutation = (): UseMutationResult<void, unknown, string, unknown> => {
    const queryClient = useQueryClient();
    return useMutation((id: string) => dataService.deleteObjective(id), {
        onSuccess: () => {
            queryClient.invalidateQueries([QueryKeys.objectives]);
        },
    });
};
