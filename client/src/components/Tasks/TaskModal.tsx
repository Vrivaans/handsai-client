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
import { useCreateTaskMutation, useUpdateTaskMutation, useListObjectivesQuery, useListAgentsQuery } from '~/data-provider';
import { useLocalize } from '~/hooks';
import { createDropdownSetter } from '~/utils';

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
    const { data: agents = { data: [] } } = useListAgentsQuery();
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [objectiveId, setObjectiveId] = useState(defaultObjectiveId || 'none');
    const [agentId, setAgentId] = useState('');
    const [type, setType] = useState('general');
    const [cronExpression, setCronExpression] = useState('');
    const [frequency, setFrequency] = useState('');
    const [maxRuns, setMaxRuns] = useState<number | ''>('');
    const [runAt, setRunAt] = useState('');
    const [customMinutes, setCustomMinutes] = useState<number | ''>('');

    const freqOptions = useMemo(() => [
        { label: localize('com_ui_freq_none') || "Don't repeat", value: '' },
        { label: localize('com_ui_freq_hourly') || 'Hourly', value: 'hourly' },
        { label: localize('com_ui_freq_daily') || 'Daily', value: 'daily' },
        { label: localize('com_ui_freq_weekly') || 'Weekly', value: 'weekly' },
        { label: localize('com_ui_freq_monthly') || 'Monthly', value: 'monthly' },
        { label: localize('com_ui_freq_custom') || 'Custom', value: 'custom' },
    ], [localize]);

    useEffect(() => {
        if (open) {
            setTitle(task?.title || '');
            setDescription(task?.description || '');
            const objId = typeof task?.objectiveId === 'object' ? task.objectiveId?._id : task?.objectiveId;
            setObjectiveId(objId || defaultObjectiveId || 'none');
            const aId = typeof task?.agentId === 'object' ? task.agentId?._id : task?.agentId;
            setAgentId(aId || '');
            setType(task?.type || 'general');
            setCronExpression(task?.schedule?.cronExpression || '');
            setMaxRuns(task?.schedule?.maxRuns || '');
            setRunAt(task?.schedule?.runAt ? new Date(task?.schedule?.runAt).toISOString().slice(0, 16) : '');
        }
    }, [open, task, defaultObjectiveId]);

    const availableObjectives = useMemo(() => {
        const list = (objectives || []).map((obj) => ({
            label: obj.title,
            value: obj._id,
        }));
        return [{ label: localize('com_ui_none') || 'None', value: 'none' }, ...list];
    }, [objectives, localize]);

    const availableAgents = useMemo(() => {
        const list = (agents?.data || []).map((agent: any) => ({
            label: agent.name || agent.id,
            value: agent._id || agent.id,
        }));
        return [{ label: localize('com_ui_select_agent') || 'Select an agent', value: '' }, ...list];
    }, [agents, localize]);

    const typeOptions = useMemo(() => [
        { label: localize('com_ui_general') || 'General', value: 'general' },
        { label: localize('com_ui_research') || 'Research', value: 'research' },
        { label: localize('com_ui_code') || 'Code', value: 'code' },
        { label: localize('com_ui_browser') || 'Browser', value: 'browser' },
    ], [localize]);

    const currentObjective = useMemo(() =>
        availableObjectives.find((obj) => obj.value === objectiveId) || availableObjectives[0],
        [availableObjectives, objectiveId]);

    const currentAgent = useMemo(() =>
        availableAgents.find((a) => a.value === agentId) || availableAgents[0],
        [availableAgents, agentId]);

    const currentType = useMemo(() =>
        typeOptions.find((t) => t.value === type) || typeOptions[0],
        [typeOptions, type]);

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
        if (!title || !agentId) return;
        const payload: any = {
            title,
            description,
            type,
            origin: task?.origin || 'user',
            status: task?.status || 'pending',
            agentId,
        };
        if (objectiveId && objectiveId !== 'none') {
            payload.objectiveId = objectiveId;
        } else {
            payload.objectiveId = null;
        }

        const schedule: any = {};
        if (cronExpression) schedule.cronExpression = cronExpression;
        if (maxRuns !== '') schedule.maxRuns = Number(maxRuns);
        if (runAt) schedule.runAt = new Date(runAt).toISOString();
        if (Object.keys(schedule).length > 0) {
            payload.schedule = schedule;
        } else if (task?.schedule) {
            payload.schedule = null;
        }

        if (task) {
            updateTask.mutate(payload, {
                onSuccess: () => {
                    onOpenChange(false);
                },
                onError: (error) => {
                    console.error('Error updating task:', error);
                }
            });
        } else {
            createTask.mutate(payload, {
                onSuccess: () => {
                    onOpenChange(false);
                    setTitle('');
                    setDescription('');
                    setObjectiveId(defaultObjectiveId || 'none');
                    setAgentId('');
                    setCronExpression('');
                    setMaxRuns('');
                    setRunAt('');
                },
                onError: (error) => {
                    console.error('Error creating task:', error);
                }
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
                                value={currentObjective}
                                setValue={createDropdownSetter(setObjectiveId)}
                                availableValues={availableObjectives}
                                showLabel={false}
                                emptyTitle={false}
                                className="bg-transparent border border-border-light rounded-md"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-sm font-medium text-text-primary">
                                {localize('com_ui_agent') || 'Agent *'}
                            </Label>
                            <SelectDropDown
                                value={currentAgent}
                                setValue={createDropdownSetter(setAgentId)}
                                availableValues={availableAgents}
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
                                value={currentType}
                                setValue={createDropdownSetter(setType)}
                                availableValues={typeOptions}
                                showLabel={false}
                                emptyTitle={false}
                                className="bg-transparent border border-border-light rounded-md"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
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
                            <div className="space-y-2">
                                <Label className="text-sm font-medium text-text-primary">
                                    {localize('com_ui_schedule_max_runs') || 'Max Runs'}
                                </Label>
                                <Input
                                    type="number"
                                    value={maxRuns}
                                    onChange={(e) => setMaxRuns(e.target.value === '' ? '' : Number(e.target.value))}
                                    placeholder="e.g. 10"
                                    className="w-full bg-transparent border-border-light"
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
                        disabled={isSubmitting || !title || !agentId}
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
