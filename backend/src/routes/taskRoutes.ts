import { Router } from 'express';
import { getTasks, getTaskAlerts, createTask, completeTask, getTaskCompletions } from '../controllers/taskController';
import { getImmunizationAlerts, completeImmunization, postponeImmunization } from '../controllers/vaccineController';
import { authenticateToken, authorizeRoles } from '../middlewares/authMiddleware';

const router = Router();
router.use(authenticateToken);

// Operational tasks
router.get('/', authorizeRoles('ADMIN', 'VETERINARIAN', 'VOLUNTEER'), getTasks);
router.get('/alerts', authorizeRoles('ADMIN', 'VETERINARIAN', 'VOLUNTEER'), getTaskAlerts);
router.post('/', authorizeRoles('ADMIN', 'VETERINARIAN'), createTask);
router.post('/:id/complete', authorizeRoles('ADMIN', 'VETERINARIAN', 'VOLUNTEER'), completeTask);
router.get('/completions', authorizeRoles('ADMIN'), getTaskCompletions);

// Immunization alerts (CU-07)
router.get('/immunization-alerts', authorizeRoles('ADMIN', 'VETERINARIAN', 'VOLUNTEER'), getImmunizationAlerts);
router.post('/immunization-alerts/:id/complete', authorizeRoles('ADMIN', 'VETERINARIAN'), completeImmunization);
router.post('/immunization-alerts/:id/postpone', authorizeRoles('ADMIN', 'VETERINARIAN'), postponeImmunization);

export default router;
