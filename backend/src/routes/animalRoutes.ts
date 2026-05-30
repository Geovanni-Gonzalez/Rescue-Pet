import { Router } from 'express';
import {
  getAnimals,
  getAnimalById,
  createAnimal,
  updateAnimal,
  updateAnimalStatus,
  getAnimalStatusHistory,
  updateRescueLocation,
  regenerateQR,
  downloadQR,
} from '../controllers/animalController';
import { getGallery, addGalleryImage, deleteGalleryImage } from '../controllers/galleryController';
import {
  getClinicalRecord,
  getMedicalSummary,
  createClinicalEntry,
} from '../controllers/clinicalController';
import { authenticateToken, authorizeRoles } from '../middlewares/authMiddleware';

const router = Router();
router.use(authenticateToken);

// List / create
router.get('/', getAnimals);
router.post('/', authorizeRoles('ADMIN', 'VOLUNTEER'), createAnimal);

// Single animal
router.get('/:id', getAnimalById);
router.patch('/:id', authorizeRoles('ADMIN', 'VOLUNTEER'), updateAnimal);

// Status
router.patch('/:id/status', authorizeRoles('ADMIN', 'VETERINARIAN'), updateAnimalStatus);
router.get('/:id/status-history', getAnimalStatusHistory);

// Location
router.put('/:id/rescue-location', authorizeRoles('ADMIN', 'VOLUNTEER'), updateRescueLocation);

// QR
router.post('/:id/qr/regenerate', authorizeRoles('ADMIN', 'VOLUNTEER', 'VETERINARIAN'), regenerateQR);
router.get('/:id/qr/download', downloadQR);

// Gallery
router.get('/:id/gallery', getGallery);
router.post('/:id/gallery', authorizeRoles('ADMIN', 'VOLUNTEER'), addGalleryImage);
router.delete('/:id/gallery/:imageId', authorizeRoles('ADMIN', 'VOLUNTEER'), deleteGalleryImage);

// Clinical
router.get('/:id/medical-summary', authorizeRoles('ADMIN', 'VETERINARIAN', 'VOLUNTEER'), getMedicalSummary);
router.get('/:id/clinical-record', authorizeRoles('ADMIN', 'VETERINARIAN'), getClinicalRecord);
router.post('/:id/clinical-record/entries', authorizeRoles('ADMIN', 'VETERINARIAN'), createClinicalEntry);

export default router;
