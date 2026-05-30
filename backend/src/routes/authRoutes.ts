import { Router } from 'express';
import {
  login,
  logout,
  getMe,
  registerAdopter,
  activateAccount,
  resendActivation,
  forgotPassword,
  resetPassword,
} from '../controllers/authController';
import { authenticateToken } from '../middlewares/authMiddleware';

const router = Router();

router.post('/login', login);
router.post('/logout', authenticateToken, logout);
router.get('/me', authenticateToken, getMe);
router.post('/register-adopter', registerAdopter);
router.get('/activate', activateAccount);
router.post('/resend-activation', resendActivation);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

export default router;
