import { Router } from 'express';
import { getPets, getPetById, createPet, updatePet, updatePetStatus, generatePetQR } from '../controllers/petController';
import { createClinicalEntry, getClinicalRecord, getMedicalSummary } from '../controllers/medicalRecordController';
import { authenticateToken, authorizeRoles } from '../middlewares/authMiddleware';

const router = Router();

router.use(authenticateToken);

router.get('/', getPets);

router.post('/', authorizeRoles('ADMIN', 'VOLUNTEER'), createPet);
router.patch('/:id', authorizeRoles('ADMIN', 'VOLUNTEER'), updatePet);

router.get('/:id/medical-summary', authorizeRoles('ADMIN', 'VETERINARIAN', 'VOLUNTEER'), getMedicalSummary);
router.get('/:id/clinical-record', authorizeRoles('ADMIN', 'VETERINARIAN', 'VOLUNTEER'), getClinicalRecord);
router.post('/:id/clinical-record/entries', authorizeRoles('ADMIN', 'VETERINARIAN'), createClinicalEntry);

router.patch('/:id/status', authorizeRoles('ADMIN', 'VETERINARIAN'), updatePetStatus);
router.post('/:id/generate-qr', authorizeRoles('ADMIN', 'VOLUNTEER', 'VETERINARIAN'), generatePetQR);

router.get('/:id', getPetById);

export default router;
