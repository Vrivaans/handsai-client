import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@librechat/client';
import { TaskTable, ObjectiveTable, ObjectiveModal, CreateTaskModal } from '~/components/Tasks';
import { useLocalize } from '~/hooks';

const TaskPanel: React.FC = () => {
    const localize = useLocalize();
    const [isObjectiveModalOpen, setIsObjectiveModalOpen] = useState(false);
    const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);

    return (
        <div className="flex h-full flex-col gap-6 overflow-y-auto px-4 py-4 hide-scrollbar">
            <section>
                <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200 uppercase tracking-tight">
                        {localize('com_ui_objectives') || 'Objectives'}
                    </h3>
                    <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 shrink-0 bg-transparent"
                        onClick={() => setIsObjectiveModalOpen(true)}
                        aria-label={localize('com_ui_add') || 'Add'}
                    >
                        <Plus className="size-4" aria-hidden="true" />
                    </Button>
                </div>
                <ObjectiveTable />
            </section>

            <section>
                <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200 uppercase tracking-tight">
                        {localize('com_ui_tasks_background') || 'Background Tasks'}
                    </h3>
                    <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 shrink-0 bg-transparent"
                        onClick={() => setIsTaskModalOpen(true)}
                        aria-label={localize('com_ui_add') || 'Add'}
                    >
                        <Plus className="size-4" aria-hidden="true" />
                    </Button>
                </div>
                <TaskTable />
            </section>

            <ObjectiveModal
                open={isObjectiveModalOpen}
                onOpenChange={setIsObjectiveModalOpen}
            />
            <CreateTaskModal
                open={isTaskModalOpen}
                onOpenChange={setIsTaskModalOpen}
            />
        </div>
    );
};

export default TaskPanel;
