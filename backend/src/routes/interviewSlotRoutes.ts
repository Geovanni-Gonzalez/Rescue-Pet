import { Router } from 'express';
import { createSlot, getAvailableSlots, cancelSlot } from '../controllers/interviewSlotController';
import { authenticateToken, authorizeRoles } from '../middlewares/authMiddleware';

const router = Router();
router.use(authenticateToken);

// GET /api/interview-slots/available — adopters and admins can list available slots
router.get('/available', getAvailableSlots);

// POST /api/interview-slots — admin creates a slot
router.post('/', authorizeRoles('ADMIN'), createSlot);

// PATCH /api/interview-slots/:id/cancel — admin cancels a slot
router.patch('/:id/cancel', authorizeRoles('ADMIN'), cancelSlot);

export default router;
