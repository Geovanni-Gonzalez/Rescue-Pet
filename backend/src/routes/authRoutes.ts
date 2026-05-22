import { Router } from 'express';
import { login, getMe, registerAdopter } from '../controllers/authController';
import { authenticateToken } from '../middlewares/authMiddleware';

const router = Router();

// Endpoint público para login
router.post('/login', login);

// Endpoint público para registro de adoptantes
router.post('/register-adopter', registerAdopter);

// Endpoint protegido para obtener datos del usuario actual
router.get('/me', authenticateToken, getMe);

export default router;
