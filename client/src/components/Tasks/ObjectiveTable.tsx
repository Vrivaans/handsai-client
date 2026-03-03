import React, { useMemo, useState } from 'react';
import {
    createColumnHelper,
    flexRender,
    getCoreRowModel,
    useReactTable,
} from '@tanstack/react-table';
import { Trophy, Target, Trash2, CheckCircle2, Circle } from 'lucide-react';
import { Button, Spinner } from '@librechat/client';
import { useListObjectivesQuery, useDeleteObjectiveMutation } from '~/data-provider';
import { ObjectiveModal } from '~/components/Tasks';
import { useLocalize } from '~/hooks';
import { cn } from '~/utils';

const columnHelper = createColumnHelper<any>();

const ObjectiveTable: React.FC = () => {
    const localize = useLocalize();
    const { data: objectives, isLoading } = useListObjectivesQuery();
    const deleteObjective = useDeleteObjectiveMutation();
    const [editingObjective, setEditingObjective] = useState<any>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    const handleEdit = (objective: any) => {
        setEditingObjective(objective);
        setIsEditModalOpen(true);
    };

    const columns = useMemo(
        () => [
            columnHelper.accessor('title', {
                header: localize('com_ui_goal') || 'Goal',
                cell: (info) => {
                    const objective = info.row.original;
                    return (
                        <div
                            className="flex cursor-pointer items-center gap-2 transition-colors hover:text-blue-500"
                            onClick={() => handleEdit(objective)}
                        >
                            <Target size={16} className="text-blue-500" />
                            <span className="font-semibold text-gray-900 dark:text-gray-100 transition-colors">
                                {info.getValue()}
                            </span>
                        </div>
                    );
                },
            }),
            columnHelper.accessor('status', {
                header: localize('com_ui_status') || 'Status',
                cell: (info) => {
                    const status = info.getValue();
                    const isComplete = status === 'completed';
                    return (
                        <div className={cn('flex items-center gap-1.5', isComplete ? 'text-green-500' : 'text-blue-500')}>
                            {isComplete ? <CheckCircle2 size={16} /> : <Circle size={16} className="animate-pulse" />}
                            <span className="text-sm font-medium capitalize">{status}</span>
                        </div>
                    );
                },
            }),
            columnHelper.accessor('tasksGenerated', {
                header: localize('com_ui_tasks') || 'Tasks',
                cell: (info) => (
                    <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                        <Trophy size={14} />
                        <span>{info.getValue() || 0}</span>
                    </div>
                ),
            }),
            columnHelper.display({
                id: 'actions',
                header: localize('com_ui_actions') || 'Actions',
                cell: (info) => {
                    const objective = info.row.original;
                    return (
                        <Button
                            variant="destructive"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => deleteObjective.mutate(objective._id)}
                            disabled={deleteObjective.isLoading}
                        >
                            {deleteObjective.isLoading ? <Spinner className="h-4 w-4" /> : <Trash2 size={14} />}
                        </Button>
                    );
                },
            }),
        ],
        [deleteObjective, localize],
    );

    const table = useReactTable({
        data: objectives || [],
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
            <div className="w-full overflow-hidden rounded-xl border border-gray-200 bg-white/50 backdrop-blur-md shadow-sm dark:border-gray-800 dark:bg-gray-900/50">
                <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50/50 dark:bg-gray-850/50">
                        {table.getHeaderGroups().map((headerGroup) => (
                            <tr key={headerGroup.id}>
                                {headerGroup.headers.map((header) => (
                                    <th key={header.id} className="px-5 py-4 font-bold text-gray-600 dark:text-gray-300">
                                        {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                                    </th>
                                ))}
                            </tr>
                        ))}
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                        {table.getRowModel().rows.map((row) => (
                            <tr key={row.id} className="hover:bg-white dark:hover:bg-gray-850 transition-colors">
                                {row.getVisibleCells().map((cell) => (
                                    <td key={cell.id} className="px-5 py-4">
                                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                    </td>
                                ))}
                            </tr>
                        ))}
                        {objectives?.length === 0 && (
                            <tr>
                                <td colSpan={columns.length} className="px-5 py-16 text-center text-gray-500 italic">
                                    {localize('com_ui_start_objective_desc') || 'Start by defining your first objective...'}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
            <ObjectiveModal
                key={editingObjective?._id || 'new'}
                open={isEditModalOpen}
                onOpenChange={setIsEditModalOpen}
                objective={editingObjective}
            />
        </>
    );
};

export default ObjectiveTable;
