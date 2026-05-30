import { Router } from 'express';
import { getAdoptionReport, getHealthReport } from '../controllers/reportController';
import { authenticateToken, authorizeRoles } from '../middlewares/authMiddleware';

const router = Router();
router.use(authenticateToken);
router.use(authorizeRoles('ADMIN'));

router.get('/adoptions', getAdoptionReport);
router.get('/health', getHealthReport);
// Export endpoints placeholder — actual PDF/Excel generation requires additional libraries
router.get('/adoptions/export', (req, res) => {
  res.json({ success: false, error: 'Exportación PDF/Excel no implementada aún. Use el endpoint base para obtener los datos.' });
});
router.get('/health/export', (req, res) => {
  res.json({ success: false, error: 'Exportación PDF/Excel no implementada aún. Use el endpoint base para obtener los datos.' });
});

export default router;
