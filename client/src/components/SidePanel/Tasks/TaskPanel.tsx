import React from 'react';
import { TaskTable, ObjectiveTable } from '~/components/Tasks';
import { useLocalize } from '~/hooks';

const TaskPanel: React.FC = () => {
    const localize = useLocalize();

    return (
        <div className="flex h-full flex-col gap-6 overflow-y-auto px-4 py-4 hide-scrollbar">
            <section>
                <h3 className="mb-3 text-sm font-bold text-gray-700 dark:text-gray-200 uppercase tracking-tight">
                    {localize('com_ui_objectives') || 'Objectives'}
                </h3>
                <ObjectiveTable />
            </section>

            <section>
                <h3 className="mb-3 text-sm font-bold text-gray-700 dark:text-gray-200 uppercase tracking-tight">
                    {localize('com_ui_tasks') || 'Background Tasks'}
                </h3>
                <TaskTable />
            </section>
        </div>
    );
};

export default TaskPanel;
