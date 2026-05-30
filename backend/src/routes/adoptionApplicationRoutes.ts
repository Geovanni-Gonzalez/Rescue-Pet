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
import { uploadDocument as uploadDocMiddleware } from '../middlewares/upload';

const router = Router();
router.use(authenticateToken);

// CU-16: Submit adoption application
router.post('/', authorizeRoles('ADOPTER'), createApplication);

// CU-18: Dashboard / tracking board
router.get('/', getApplications);
router.get('/:id', getApplicationById);
router.patch('/:id/status', authorizeRoles('ADMIN'), updateApplicationStatus);

// CU-17: Interview scheduling
router.post('/:id/schedule-interview', authorizeRoles('ADOPTER'), scheduleInterview);

// CU-19: Document repository — real file upload via multipart/form-data
router.post('/:id/documents', authorizeRoles('ADOPTER', 'ADMIN'), uploadDocMiddleware.single('file'), uploadDocument);
router.get('/:id/documents', getDocuments);

// CU-20: Contract
router.post('/:id/contract/generate', authorizeRoles('ADMIN'), generateContract);
router.get('/:id/contract', getContract);
router.post('/:id/contract/sign', authorizeRoles('ADOPTER'), signContract);

export default router;
