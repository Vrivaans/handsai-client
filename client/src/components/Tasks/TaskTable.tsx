import React, { useMemo, useState } from 'react';
import {
    createColumnHelper,
    flexRender,
    getCoreRowModel,
    useReactTable,
} from '@tanstack/react-table';
import { Play, Pause, Trash2, CheckCircle, Clock, AlertCircle, Loader2 } from 'lucide-react';
import { Button, Spinner } from '@librechat/client';
import { useListTasksQuery, useDeleteTaskMutation, useUpdateTaskStatusMutation } from '~/data-provider';
import { TaskModal } from '~/components/Tasks';
import { useLocalize } from '~/hooks';
import { cn } from '~/utils';

const columnHelper = createColumnHelper<any>();

const TaskTable: React.FC<{ objectiveId?: string }> = ({ objectiveId }) => {
    const localize = useLocalize();
    const { data: tasks, isLoading } = useListTasksQuery({ objectiveId });
    const deleteTask = useDeleteTaskMutation();
    const updateTaskStatus = useUpdateTaskStatusMutation();
    const [editingTask, setEditingTask] = useState<any>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    const handleEdit = (task: any) => {
        setEditingTask(task);
        setIsEditModalOpen(true);
    };

    const columns = useMemo(
        () => [
            columnHelper.accessor('_id', {
                header: localize('com_ui_id') || 'ID',
                cell: (info) => <span className="text-xs text-gray-500">{info.getValue().slice(-6)}</span>,
            }),
            columnHelper.accessor('title', {
                header: localize('com_ui_title') || 'Title',
                cell: (info) => {
                    const task = info.row.original;
                    return (
                        <div
                            className="cursor-pointer font-medium text-gray-900 dark:text-gray-100 transition-colors hover:text-blue-500"
                            onClick={() => handleEdit(task)}
                        >
                            {info.getValue() || 'Untitled'}
                        </div>
                    );
                },
            }),
            columnHelper.accessor('type', {
                header: localize('com_ui_type') || 'Type',
                cell: (info) => <span className="text-sm text-gray-600 dark:text-gray-400">{info.getValue()}</span>,
            }),
            columnHelper.accessor('status', {
                header: localize('com_ui_status') || 'Status',
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
                header: localize('com_ui_schedule') || 'Schedule',
                cell: (info) => {
                    const schedule = info.getValue();
                    if (!schedule) return <span className="text-gray-400">{localize('com_ui_manual') || 'Manual'}</span>;
                    return <span className="text-sm text-gray-600 dark:text-gray-400">{schedule.type}</span>;
                },
            }),
            columnHelper.display({
                id: 'actions',
                header: localize('com_ui_actions') || 'Actions',
                cell: (info) => {
                    const task = info.row.original;
                    return (
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    const nextStatus = task.status === 'cancelled' ? 'pending' : 'cancelled';
                                    updateTaskStatus.mutate({ id: task._id, status: nextStatus });
                                }}
                                disabled={updateTaskStatus.isLoading && updateTaskStatus.variables?.id === task._id}
                            >
                                {updateTaskStatus.isLoading && updateTaskStatus.variables?.id === task._id ? (
                                    <Spinner className="h-4 w-4" />
                                ) : task.status === 'cancelled' ? (
                                    <Play size={14} />
                                ) : (
                                    <Pause size={14} />
                                )}
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
        [deleteTask, updateTaskStatus, localize],
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
        <>
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
                                    {localize('com_ui_no_tasks_found') || 'No tasks found.'}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
            <TaskModal
                key={editingTask?._id || 'new'}
                open={isEditModalOpen}
                onOpenChange={setIsEditModalOpen}
                task={editingTask}
            />
        </>
    );
};

export default TaskTable;
