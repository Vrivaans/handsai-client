import React, { useMemo } from 'react';
import {
    createColumnHelper,
    flexRender,
    getCoreRowModel,
    useReactTable,
} from '@tanstack/react-table';
import { Play, Pause, Trash2, CheckCircle, Clock, AlertCircle, Loader2 } from 'lucide-react';
import { Button, Spinner } from '@librechat/client';
import { useListTasksQuery, useDeleteTaskMutation, useUpdateTaskMutation } from '~/data-provider';
import { cn } from '~/utils';

const columnHelper = createColumnHelper<any>();

const TaskTable: React.FC<{ objectiveId?: string }> = ({ objectiveId }) => {
    const { data: tasks, isLoading } = useListTasksQuery({ objectiveId });
    const deleteTask = useDeleteTaskMutation();
    const updateTask = useUpdateTaskMutation(''); // We'll set the ID dynamically in the mutation call or handle it differently

    const columns = useMemo(
        () => [
            columnHelper.accessor('_id', {
                header: 'ID',
                cell: (info) => <span className="text-xs text-gray-500">{info.getValue().slice(-6)}</span>,
            }),
            columnHelper.accessor('type', {
                header: 'Type',
                cell: (info) => <span className="font-medium text-gray-900 dark:text-gray-100">{info.getValue()}</span>,
            }),
            columnHelper.accessor('status', {
                header: 'Status',
                cell: (info) => {
                    const status = info.getValue();
                    const statusConfig: Record<string, { icon: any; color: string }> = {
                        pending: { icon: Clock, color: 'text-yellow-500' },
                        running: { icon: Loader2, color: 'text-blue-500' },
                        completed: { icon: CheckCircle, color: 'text-green-500' },
                        failed: { icon: AlertCircle, color: 'text-red-500' },
                    };
                    const Config = statusConfig[status] || statusConfig.pending;
                    const Icon = Config.icon;
                    return (
                        <div className={cn('flex items-center gap-1.5', Config.color)}>
                            <Icon size={16} className={status === 'running' ? 'animate-spin' : ''} />
                            <span className="text-sm capitalize">{status}</span>
                        </div>
                    );
                },
            }),
            columnHelper.accessor('schedule', {
                header: 'Schedule',
                cell: (info) => {
                    const schedule = info.getValue();
                    if (!schedule) return <span className="text-gray-400">Manual</span>;
                    return <span className="text-sm text-gray-600 dark:text-gray-400">{schedule.type}</span>;
                },
            }),
            columnHelper.display({
                id: 'actions',
                header: 'Actions',
                cell: (info) => {
                    const task = info.row.original;
                    return (
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() => {
                                    /* TODO: toggle pause/resume */
                                }}
                            >
                                {task.status === 'paused' ? <Play size={14} /> : <Pause size={14} />}
                            </Button>
                            <Button
                                variant="destructive"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() => deleteTask.mutate(task._id)}
                                disabled={deleteTask.isLoading}
                            >
                                {deleteTask.isLoading ? <Spinner className="h-4 w-4" /> : <Trash2 size={14} />}
                            </Button>
                        </div>
                    );
                },
            }),
        ],
        [deleteTask],
    );

    const table = useReactTable({
        data: tasks || [],
        columns,
        getCoreRowModel: getCoreRowModel(),
    });

    if (isLoading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <Spinner />
            </div>
        );
    }

    return (
        <div className="w-full overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <table className="w-full text-left">
                <thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-850">
                    {table.getHeaderGroups().map((headerGroup) => (
                        <tr key={headerGroup.id}>
                            {headerGroup.headers.map((header) => (
                                <th key={header.id} className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                                </th>
                            ))}
                        </tr>
                    ))}
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                    {table.getRowModel().rows.map((row) => (
                        <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-gray-850/50 transition-colors">
                            {row.getVisibleCells().map((cell) => (
                                <td key={cell.id} className="whitespace-nowrap px-4 py-3 align-middle">
                                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                </td>
                            ))}
                        </tr>
                    ))}
                    {tasks?.length === 0 && (
                        <tr>
                            <td colSpan={columns.length} className="px-4 py-12 text-center text-gray-500">
                                No tasks found.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
};

export default TaskTable;
