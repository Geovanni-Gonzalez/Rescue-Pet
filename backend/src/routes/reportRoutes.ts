import { Router } from 'express';
import {
  getAdoptionReport,
  getHealthReport,
  getSpeciesList,
  exportAdoptionPdf,
  exportHealthPdf,
  exportAdoptionCsv,
  exportHealthCsv,
} from '../controllers/reportController';
import { authenticateToken, authorizeRoles } from '../middlewares/authMiddleware';

const router = Router();
router.use(authenticateToken);
router.use(authorizeRoles('ADMIN'));

router.get('/species', getSpeciesList);

router.get('/adoptions', getAdoptionReport);
router.get('/adoptions/export/pdf', exportAdoptionPdf);
router.get('/adoptions/export/csv', exportAdoptionCsv);

router.get('/health', getHealthReport);
router.get('/health/export/pdf', exportHealthPdf);
router.get('/health/export/csv', exportHealthCsv);

export default router;
