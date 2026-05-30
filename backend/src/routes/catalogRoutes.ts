import { Router } from 'express';
import { getCatalog, getCatalogAnimalById } from '../controllers/catalogController';
import { authenticateToken } from '../middlewares/authMiddleware';

const router = Router();
router.use(authenticateToken);

router.get('/animals', getCatalog);
router.get('/animals/:id', getCatalogAnimalById);

export default router;
