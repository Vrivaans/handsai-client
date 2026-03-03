import express from 'express';
import * as taskService from './taskService';

const router = express.Router();

router.get('/', (async (req: any, res: any) => {
    try {
        const { status, objectiveId } = req.query;
        const tasks = await taskService.getTasks(req.user.id, {
            status: status as any,
            objectiveId: objectiveId as string,
        });
        res.json(tasks);
    } catch (error) {
        res.status(500).json({ message: (error as Error).message });
    }
}) as any);

router.post('/', (async (req: any, res: any) => {
    try {
        const task = await taskService.createTask(req.user.id, req.body);
        res.status(201).json(task);
    } catch (error) {
        res.status(400).json({ message: (error as Error).message });
    }
}) as any);

router.get('/:id', (async (req: any, res: any) => {
    try {
        const task = await taskService.getTaskById(req.user.id, req.params.id);
        if (!task) {
            return res.status(404).json({ message: 'Task not found' });
        }
        res.json(task);
    } catch (error) {
        res.status(500).json({ message: (error as Error).message });
    }
}) as any);

router.patch('/:id', (async (req: any, res: any) => {
    try {
        const task = await taskService.updateTask(req.user.id, req.params.id, req.body);
        if (!task) {
            return res.status(404).json({ message: 'Task not found' });
        }
        res.json(task);
    } catch (error) {
        res.status(400).json({ message: (error as Error).message });
    }
}) as any);

router.delete('/:id', (async (req: any, res: any) => {
    try {
        const success = await taskService.deleteTask(req.user.id, req.params.id);
        if (!success) {
            return res.status(404).json({ message: 'Task not found' });
        }
        res.status(204).end();
    } catch (error) {
        res.status(500).json({ message: (error as Error).message });
    }
}) as any);

export default router;
export { router as taskRouter };
