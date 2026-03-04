import React, { useState, useEffect, useMemo } from 'react';
import {
    OGDialog,
    OGDialogTemplate,
    Button,
    Input,
    Label,
    Textarea,
} from '@librechat/client';
import { useCreateObjectiveMutation, useUpdateObjectiveMutation } from '~/data-provider';
import { useLocalize } from '~/hooks';
import { createDropdownSetter } from '~/utils';
import { SelectDropDown } from '@librechat/client';

const CreateObjectiveModal: React.FC<{
    open: boolean;
    onOpenChange: (open: boolean) => void;
    objective?: any;
}> = ({ open, onOpenChange, objective }) => {
    const localize = useLocalize();
    const createObjective = useCreateObjectiveMutation();
    const updateObjective = useUpdateObjectiveMutation(objective?._id || '');
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [enabled, setEnabled] = useState(true);
    const [cronExpression, setCronExpression] = useState('');
    const [frequency, setFrequency] = useState('');
    const [runAt, setRunAt] = useState('');
    const [customMinutes, setCustomMinutes] = useState<number | ''>('');

    useEffect(() => {
        if (open) {
            setTitle(objective?.title || '');
            setDescription(objective?.description || '');
            setEnabled(objective?.runner?.enabled ?? true);
            const cron = objective?.runner?.cronExpression || '';
            setCronExpression(cron);

            if (cron.startsWith('*/') && cron.endsWith('* * * *')) {
                setFrequency('custom');
                setCustomMinutes(Number(cron.split(' ')[0].replace('*/', '')));
            } else {
                setFrequency(cron ? 'custom' : '');
                setCustomMinutes('');
            }
            setRunAt('');
        }
    }, [open, objective]);

    const enabledOptions = useMemo(() => [
        { label: localize('com_ui_enabled'), value: 'true' },
        { label: localize('com_ui_disabled'), value: 'false' }
    ], [localize]);

    const currentEnabled = useMemo(() =>
        enabledOptions.find(o => o.value === (enabled ? 'true' : 'false')) || enabledOptions[0],
        [enabled, enabledOptions]);

    const freqOptions = useMemo(() => [
        { label: localize('com_ui_freq_none'), value: '' },
        { label: localize('com_ui_freq_hourly'), value: 'hourly' },
        { label: localize('com_ui_freq_daily'), value: 'daily' },
        { label: localize('com_ui_freq_weekly'), value: 'weekly' },
        { label: localize('com_ui_freq_monthly'), value: 'monthly' },
        { label: localize('com_ui_freq_custom'), value: 'custom' },
    ], [localize]);

    // Auto-calculate cron expression when frequency or runAt changes
    useEffect(() => {
        if (!frequency) return;

        if (frequency === 'custom' && customMinutes !== '') {
            setCronExpression(`*/${customMinutes} * * * *`);
            return;
        }

        let minute = '0';
        let hour = '*';
        let dom = '*';
        let month = '*';
        let dow = '*';

        if (runAt) {
            const date = new Date(runAt);
            if (!isNaN(date.getTime())) {
                minute = date.getMinutes().toString();
                hour = date.getHours().toString();
                dom = date.getDate().toString();
            }
        }

        switch (frequency) {
            case 'hourly':
                hour = '*'; dom = '*'; month = '*'; dow = '*';
                break;
            case 'daily':
                dom = '*'; month = '*'; dow = '*';
                break;
            case 'weekly':
                dom = '*'; month = '*';
                if (runAt) dow = new Date(runAt).getDay().toString();
                break;
            case 'monthly':
                month = '*'; dow = '*';
                break;
        }

        if (frequency !== 'custom') {
            setCronExpression(`${minute} ${hour} ${dom} ${month} ${dow}`);
        }
    }, [frequency, runAt, customMinutes]);

    const handleSave = () => {
        if (!title) return;
        const payload: any = {
            title,
            description,
            runner: {
                enabled,
                cronExpression,
            }
        };

        if (objective) {
            updateObjective.mutate(payload, {
                onSuccess: () => {
                    onOpenChange(false);
                },
            });
        } else {
            createObjective.mutate(payload, {
                onSuccess: () => {
                    onOpenChange(false);
                    setTitle('');
                    setDescription('');
                    setEnabled(true);
                    setCronExpression('');
                    setFrequency('');
                    setRunAt('');
                },
            });
        }
    };

    const isSubmitting = createObjective.isLoading || updateObjective.isLoading;

    return (
        <OGDialog open={open} onOpenChange={onOpenChange}>
            <OGDialogTemplate
                title={objective ? localize('com_ui_edit_objective') || 'Edit Objective' : localize('com_ui_create_objective') || 'New Objective'}
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
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-sm font-medium text-text-primary">
                                    {localize('com_ui_status') || 'Runner Status'}
                                </Label>
                                <SelectDropDown
                                    value={currentEnabled}
                                    setValue={(val) => setEnabled(val === 'true')}
                                    availableValues={enabledOptions}
                                    showLabel={false}
                                    emptyTitle={false}
                                    className="bg-transparent border border-border-light rounded-md"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-sm font-medium text-text-primary">
                                    {localize('com_ui_frequency') || 'Frecuencia'}
                                </Label>
                                <SelectDropDown
                                    value={frequency}
                                    setValue={createDropdownSetter(setFrequency)}
                                    availableValues={freqOptions}
                                    showLabel={false}
                                    emptyTitle={false}
                                    className="bg-transparent border border-border-light rounded-md"
                                />
                            </div>
                        </div>

                        {frequency === 'custom' && (
                            <div className="space-y-2">
                                <Label className="text-sm font-medium text-text-primary">
                                    {localize('com_ui_frequency_minutes') || 'Minutos'}
                                </Label>
                                <Input
                                    type="number"
                                    value={customMinutes}
                                    onChange={(e) => setCustomMinutes(e.target.value === '' ? '' : Number(e.target.value))}
                                    placeholder="Ej. 15 (para cada 15 min)"
                                    className="w-full bg-transparent border-border-light"
                                />
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label className="text-sm font-medium text-text-primary">
                                {localize('com_ui_schedule_run_at') || 'Run At (Specific Time)'}
                            </Label>
                            <Input
                                type="datetime-local"
                                value={runAt}
                                onChange={(e) => setRunAt(e.target.value)}
                                className="w-full bg-transparent border-border-light"
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

export default CreateObjectiveModal;
