import { Router } from 'express';
import { getMyTest, saveTestAndRecalculate, recalculateCompatibility, getCompatibilityResults } from '../controllers/matchmakingController';
import { authenticateToken, authorizeRoles } from '../middlewares/authMiddleware';

const router = Router();
router.use(authenticateToken);

// CU-14: Compatibility test
router.get('/me/compatibility-test', authorizeRoles('ADOPTER'), getMyTest);
router.put('/me/compatibility-test', authorizeRoles('ADOPTER'), saveTestAndRecalculate);

// CU-15: Recalculate using saved test (no body required)
router.post('/me/compatibility/recalculate', authorizeRoles('ADOPTER'), recalculateCompatibility);
router.get('/me/compatibility-results', authorizeRoles('ADOPTER'), getCompatibilityResults);

export default router;
