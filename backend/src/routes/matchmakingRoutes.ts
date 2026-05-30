import { Router } from 'express';
import { getMyTest, saveTestAndRecalculate, getCompatibilityResults } from '../controllers/matchmakingController';
import { authenticateToken, authorizeRoles } from '../middlewares/authMiddleware';

const router = Router();
router.use(authenticateToken);

// CU-14: Compatibility test
router.get('/me/compatibility-test', authorizeRoles('ADOPTER'), getMyTest);
router.put('/me/compatibility-test', authorizeRoles('ADOPTER'), saveTestAndRecalculate);

// CU-15: Recalculate and get results
router.post('/me/compatibility/recalculate', authorizeRoles('ADOPTER'), saveTestAndRecalculate);
router.get('/me/compatibility-results', authorizeRoles('ADOPTER'), getCompatibilityResults);

export default router;
