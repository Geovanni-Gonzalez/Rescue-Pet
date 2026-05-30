import { Router } from 'express';
import {
  createApplication,
  getApplications,
  getApplicationById,
  updateApplicationStatus,
  uploadDocument,
  getDocuments,
  generateContract,
  getContract,
  signContract,
} from '../controllers/adoptionApplicationController';
import { scheduleInterview } from '../controllers/interviewSlotController';
import { authenticateToken, authorizeRoles } from '../middlewares/authMiddleware';

const router = Router();
router.use(authenticateToken);

router.post('/', authorizeRoles('ADOPTER'), createApplication);
router.get('/', getApplications);
router.get('/:id', getApplicationById);
router.patch('/:id/status', authorizeRoles('ADMIN'), updateApplicationStatus);

// Interview scheduling
router.post('/:id/schedule-interview', authorizeRoles('ADOPTER'), scheduleInterview);

// Documents
router.post('/:id/documents', authorizeRoles('ADOPTER', 'ADMIN'), uploadDocument);
router.get('/:id/documents', getDocuments);

// Contract
router.post('/:id/contract/generate', authorizeRoles('ADMIN'), generateContract);
router.get('/:id/contract', getContract);
router.post('/:id/contract/sign', authorizeRoles('ADOPTER'), signContract);

export default router;
