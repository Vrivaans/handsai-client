import { useQuery, useQueryClient } from '@tanstack/react-query';
import { QueryKeys, dataService } from 'librechat-data-provider';
import type { QueryObserverResult, UseQueryOptions } from '@tanstack/react-query';

/**
 * Hook for listing all Tasks
 */
export const useListTasksQuery = <TData = any[]>(
    params?: { status?: string; objectiveId?: string },
    config?: UseQueryOptions<any[], unknown, TData>,
): QueryObserverResult<TData> => {
    return useQuery<any[], unknown, TData>(
        [QueryKeys.tasks, params],
        () => dataService.getTasks(params),
        {
            refetchOnWindowFocus: false,
            refetchOnReconnect: false,
            refetchOnMount: true,
            retry: false,
            ...config,
        },
    );
};

/**
 * Hook for retrieving a single Task by ID
 */
export const useGetTaskByIdQuery = (
    id: string,
    config?: UseQueryOptions<any>,
): QueryObserverResult<any> => {
    return useQuery<any>(
        [QueryKeys.task, id],
        () => dataService.getTaskById(id),
        {
            refetchOnWindowFocus: false,
            refetchOnReconnect: false,
            refetchOnMount: true,
            retry: false,
            enabled: !!id,
            ...config,
        },
    );
};

/**
 * Hook for listing all Objectives
 */
export const useListObjectivesQuery = <TData = any[]>(
    params?: { status?: string },
    config?: UseQueryOptions<any[], unknown, TData>,
): QueryObserverResult<TData> => {
    return useQuery<any[], unknown, TData>(
        [QueryKeys.objectives, params],
        () => dataService.getObjectives(params),
        {
            refetchOnWindowFocus: false,
            refetchOnReconnect: false,
            refetchOnMount: true,
            retry: false,
            ...config,
        },
    );
};

/**
 * Hook for retrieving a single Objective by ID
 */
export const useGetObjectiveByIdQuery = (
    id: string,
    config?: UseQueryOptions<any>,
): QueryObserverResult<any> => {
    return useQuery<any>(
        [QueryKeys.objective, id],
        () => dataService.getObjectiveById(id),
        {
            refetchOnWindowFocus: false,
            refetchOnReconnect: false,
            refetchOnMount: true,
            retry: false,
            enabled: !!id,
            ...config,
        },
    );
};
