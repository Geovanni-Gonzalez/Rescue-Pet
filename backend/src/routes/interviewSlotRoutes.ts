import { Router } from 'express';
import { createSlot, getAvailableSlots, getAllSlots, cancelSlot } from '../controllers/interviewSlotController';
import { authenticateToken, authorizeRoles } from '../middlewares/authMiddleware';

const router = Router();
router.use(authenticateToken);

// GET /api/interview-slots/available — adopters and admins can list available slots
router.get('/available', getAvailableSlots);

// GET /api/interview-slots — admin agenda panel: all upcoming slots (incl. reserved)
router.get('/', authorizeRoles('ADMIN'), getAllSlots);

// POST /api/interview-slots — admin creates a slot
router.post('/', authorizeRoles('ADMIN'), createSlot);

// PATCH /api/interview-slots/:id/cancel — admin cancels a slot (CU-17 1A:
// also frees reserved slots, reverting the application and notifying the adopter)
router.patch('/:id/cancel', authorizeRoles('ADMIN'), cancelSlot);

export default router;
