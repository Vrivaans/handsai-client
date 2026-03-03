import React, { useState } from 'react';
import {
    OGDialog,
    OGDialogTemplate,
    Button,
    Input,
    Label,
    Textarea,
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@librechat/client';
import { useCreateTaskMutation, useListObjectivesQuery } from '~/data-provider';
import { useLocalize } from '~/hooks';

const CreateTaskModal: React.FC<{
    open: boolean;
    onOpenChange: (open: boolean) => void;
    defaultObjectiveId?: string;
}> = ({ open, onOpenChange, defaultObjectiveId }) => {
    const localize = useLocalize();
    const createTask = useCreateTaskMutation();
    const { data: objectives } = useListObjectivesQuery();
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [objectiveId, setObjectiveId] = useState(defaultObjectiveId || 'none');
    const [type, setType] = useState('general');

    const handleSave = () => {
        if (!title) return;
        const data: any = {
            title,
            description,
            type,
            origin: 'user',
            status: 'pending',
        };
        if (objectiveId && objectiveId !== 'none') {
            data.objectiveId = objectiveId;
        }

        createTask.mutate(data, {
            onSuccess: () => {
                onOpenChange(false);
                setTitle('');
                setDescription('');
                setObjectiveId(defaultObjectiveId || 'none');
            },
        });
    };

    return (
        <OGDialog open={open} onOpenChange={onOpenChange}>
            <OGDialogTemplate
                title={localize('com_ui_create_task') || 'New Task'}
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
                            <Select value={objectiveId} onValueChange={setObjectiveId}>
                                <SelectTrigger className="bg-transparent">
                                    <SelectValue placeholder={localize('com_ui_select_objective') || 'Select an objective'} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">{localize('com_ui_none') || 'None'}</SelectItem>
                                    {objectives?.map((obj) => (
                                        <SelectItem key={obj._id} value={obj._id}>
                                            {obj.title}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-sm font-medium text-text-primary">
                                {localize('com_ui_type') || 'Type'}
                            </Label>
                            <Select value={type} onValueChange={setType}>
                                <SelectTrigger className="bg-transparent">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="general">{localize('com_ui_general') || 'General'}</SelectItem>
                                    <SelectItem value="research">{localize('com_ui_research') || 'Research'}</SelectItem>
                                    <SelectItem value="code">{localize('com_ui_code') || 'Code'}</SelectItem>
                                    <SelectItem value="browser">{localize('com_ui_browser') || 'Browser'}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                }
                buttons={
                    <Button
                        variant="submit"
                        onClick={handleSave}
                        disabled={createTask.isLoading || !title}
                        className="text-white"
                    >
                        {createTask.isLoading ? localize('com_ui_creating') || 'Saving...' : localize('com_ui_save') || 'Guardar'}
                    </Button>
                }
            />
        </OGDialog>
    );
};

export default CreateTaskModal;
