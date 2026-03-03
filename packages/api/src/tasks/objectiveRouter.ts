import express from 'express';
import * as objectiveService from './objectiveService';

const router = express.Router();

router.get('/', (async (req: any, res: any) => {
    try {
        const { status } = req.query;
        const objectives = await objectiveService.getObjectives(req.user.id, {
            status: status as string,
        });
        res.json(objectives);
    } catch (error) {
        res.status(500).json({ message: (error as Error).message });
    }
}) as any);

router.post('/', (async (req: any, res: any) => {
    try {
        const objective = await objectiveService.createObjective(req.user.id, req.body);
        res.status(201).json(objective);
    } catch (error) {
        res.status(400).json({ message: (error as Error).message });
    }
}) as any);

router.get('/:id', (async (req: any, res: any) => {
    try {
        const objective = await objectiveService.getObjectiveById(req.user.id, req.params.id);
        if (!objective) {
            return res.status(404).json({ message: 'Objective not found' });
        }
        res.json(objective);
    } catch (error) {
        res.status(500).json({ message: (error as Error).message });
    }
}) as any);

router.patch('/:id', (async (req: any, res: any) => {
    try {
        const objective = await objectiveService.updateObjective(req.user.id, req.params.id, req.body);
        if (!objective) {
            return res.status(404).json({ message: 'Objective not found' });
        }
        res.json(objective);
    } catch (error) {
        res.status(400).json({ message: (error as Error).message });
    }
}) as any);

router.delete('/:id', (async (req: any, res: any) => {
    try {
        const success = await objectiveService.deleteObjective(req.user.id, req.params.id);
        if (!success) {
            return res.status(404).json({ message: 'Objective not found' });
        }
        res.status(204).end();
    } catch (error) {
        res.status(500).json({ message: (error as Error).message });
    }
}) as any);

export default router;
export { router as objectiveRouter };
