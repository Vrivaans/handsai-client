import React, { useState } from 'react';
import {
    OGDialog,
    OGDialogTemplate,
    Button,
    Input,
    Label,
    Textarea,
} from '@librechat/client';
import { useCreateObjectiveMutation } from '~/data-provider';
import { useLocalize } from '~/hooks';

const CreateObjectiveModal: React.FC<{ open: boolean; onOpenChange: (open: boolean) => void }> = ({
    open,
    onOpenChange,
}) => {
    const localize = useLocalize();
    const createObjective = useCreateObjectiveMutation();
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');

    const handleSave = () => {
        if (!title) return;
        createObjective.mutate(
            { title, description },
            {
                onSuccess: () => {
                    onOpenChange(false);
                    setTitle('');
                    setDescription('');
                },
            }
        );
    };

    return (
        <OGDialog open={open} onOpenChange={onOpenChange}>
            <OGDialogTemplate
                title={localize('com_ui_create_objective') || 'New Objective'}
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
                    </div>
                }
                buttons={
                    <Button
                        variant="submit"
                        onClick={handleSave}
                        disabled={createObjective.isLoading || !title}
                        className="text-white"
                    >
                        {createObjective.isLoading ? localize('com_ui_creating') || 'Saving...' : localize('com_ui_save') || 'Guardar'}
                    </Button>
                }
            />
        </OGDialog>
    );
};

export default CreateObjectiveModal;
