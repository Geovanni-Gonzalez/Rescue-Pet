import { Router } from 'express';
import { getMyTest, saveTestAndCalculate, getCatalog } from '../controllers/matchmakingController';
import { authenticateToken, authorizeRoles } from '../middlewares/authMiddleware';

const router = Router();

router.use(authenticateToken);

// Solo adoptantes pueden ver el catálogo personalizado y hacer el test
router.get('/catalog', authorizeRoles('ADOPTER'), getCatalog);
router.get('/test/me', authorizeRoles('ADOPTER'), getMyTest);
router.post('/test', authorizeRoles('ADOPTER'), saveTestAndCalculate);

export default router;
