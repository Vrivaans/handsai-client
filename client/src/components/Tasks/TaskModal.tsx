import React, { useState, useEffect, useMemo } from 'react';
import {
    OGDialog,
    OGDialogTemplate,
    Button,
    Input,
    Label,
    Textarea,
    SelectDropDown,
} from '@librechat/client';
import { useCreateTaskMutation, useUpdateTaskMutation, useListObjectivesQuery } from '~/data-provider';
import { useLocalize } from '~/hooks';

const TaskModal: React.FC<{
    open: boolean;
    onOpenChange: (open: boolean) => void;
    task?: any;
    defaultObjectiveId?: string;
}> = ({ open, onOpenChange, task, defaultObjectiveId }) => {
    const localize = useLocalize();
    const createTask = useCreateTaskMutation();
    const updateTask = useUpdateTaskMutation(task?._id || '');
    const { data: objectives } = useListObjectivesQuery();
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [objectiveId, setObjectiveId] = useState(defaultObjectiveId || 'none');
    const [type, setType] = useState('general');

    useEffect(() => {
        if (open) {
            setTitle(task?.title || '');
            setDescription(task?.description || '');
            setObjectiveId(task?.objectiveId || defaultObjectiveId || 'none');
            setType(task?.type || 'general');
        }
    }, [open, task, defaultObjectiveId]);

    const availableObjectives = useMemo(() => {
        const list = (objectives || []).map((obj) => ({
            label: obj.title,
            value: obj._id,
        }));
        return [{ label: localize('com_ui_none') || 'None', value: 'none' }, ...list];
    }, [objectives, localize]);

    const typeOptions = useMemo(() => [
        { label: localize('com_ui_general') || 'General', value: 'general' },
        { label: localize('com_ui_research') || 'Research', value: 'research' },
        { label: localize('com_ui_code') || 'Code', value: 'code' },
        { label: localize('com_ui_browser') || 'Browser', value: 'browser' },
    ], [localize]);

    const handleSave = () => {
        if (!title) return;
        const payload: any = {
            title,
            description,
            type,
            origin: task?.origin || 'user',
            status: task?.status || 'pending',
        };
        if (objectiveId && objectiveId !== 'none') {
            payload.objectiveId = objectiveId;
        } else {
            payload.objectiveId = null;
        }

        if (task) {
            updateTask.mutate(payload, {
                onSuccess: () => {
                    onOpenChange(false);
                },
            });
        } else {
            createTask.mutate(payload, {
                onSuccess: () => {
                    onOpenChange(false);
                    setTitle('');
                    setDescription('');
                    setObjectiveId(defaultObjectiveId || 'none');
                },
            });
        }
    };

    const isSubmitting = createTask.isLoading || updateTask.isLoading;

    return (
        <OGDialog open={open} onOpenChange={onOpenChange}>
            <OGDialogTemplate
                title={task ? localize('com_ui_edit_task') || 'Edit Task' : localize('com_ui_create_task') || 'New Task'}
                showCloseButton={false}
                className="w-11/12 md:max-w-lg"
                main={
                    <div className="space-y-4 py-2">
                        <div className="space-y-2">
                            <Label htmlFor="title" className="text-sm font-medium text-text-primary">
                                {localize('com_ui_title') || 'Título'}
                            </Label>
                            <Input
                                id="title"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder={localize('com_ui_enter_name') || 'Enter name'}
                                className="w-full bg-transparent"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="description" className="text-sm font-medium text-text-primary">
                                {localize('com_ui_description') || 'Descripción'}
                            </Label>
                            <Textarea
                                id="description"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder={localize('com_ui_enter_description') || 'Enter description (optional)'}
                                className="min-h-[100px] w-full resize-none bg-transparent"
                                rows={3}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-sm font-medium text-text-primary">
                                {localize('com_ui_objective') || 'Objective'}
                            </Label>
                            <SelectDropDown
                                value={objectiveId}
                                setValue={setObjectiveId}
                                availableValues={availableObjectives}
                                showLabel={false}
                                emptyTitle={false}
                                className="bg-transparent border border-border-light rounded-md"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-sm font-medium text-text-primary">
                                {localize('com_ui_type') || 'Type'}
                            </Label>
                            <SelectDropDown
                                value={type}
                                setValue={setType}
                                availableValues={typeOptions}
                                showLabel={false}
                                emptyTitle={false}
                                className="bg-transparent border border-border-light rounded-md"
                            />
                        </div>
                    </div>
                }
                buttons={
                    <Button
                        variant="submit"
                        onClick={handleSave}
                        disabled={isSubmitting || !title}
                        className="text-white"
                    >
                        {isSubmitting ? localize('com_ui_creating') || 'Saving...' : localize('com_ui_save') || 'Guardar'}
                    </Button>
                }
            />
        </OGDialog>
    );
};

export default TaskModal;
