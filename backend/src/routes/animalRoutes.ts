import { Router } from 'express';
import {
  getAnimals,
  getAnimalById,
  createAnimal,
  deleteAllAnimals,
  deleteAnimal,
  updateAnimal,
  updateAnimalStatus,
  getAnimalStatusHistory,
  updateRescueLocation,
  getLocationHistory,
  regenerateQR,
  downloadQR,
} from '../controllers/animalController';
import { addGalleryImages, deleteGalleryImage, getGallery } from '../controllers/galleryController';
import { getClinicalRecord, getMedicalSummary, createClinicalEntry } from '../controllers/clinicalController';
import { createVaccine, getAnimalVaccines } from '../controllers/vaccineController';
import { authenticateToken, authorizeRoles } from '../middlewares/authMiddleware';
import { uploadAnimalPhoto, uploadGalleryPhotos } from '../middlewares/upload';

const router = Router();
router.use(authenticateToken);

// List / create
router.get('/', getAnimals);
router.post('/', authorizeRoles('ADMIN', 'VOLUNTEER'), uploadAnimalPhoto.single('mainPhoto'), createAnimal);
router.delete('/', authorizeRoles('ADMIN'), deleteAllAnimals);

// Single animal
router.get('/:id', getAnimalById);
router.patch('/:id', authorizeRoles('ADMIN', 'VOLUNTEER', 'VETERINARIAN'), uploadAnimalPhoto.single('mainPhoto'), updateAnimal);
router.delete('/:id', authorizeRoles('ADMIN'), deleteAnimal);

// Status
router.patch('/:id/status', authorizeRoles('ADMIN', 'VETERINARIAN'), updateAnimalStatus);
router.get('/:id/status-history', getAnimalStatusHistory);

// Location
router.put('/:id/rescue-location', authorizeRoles('ADMIN', 'VOLUNTEER'), updateRescueLocation);
router.get('/:id/location-history', authorizeRoles('ADMIN', 'VETERINARIAN', 'VOLUNTEER'), getLocationHistory);

// QR
router.post('/:id/qr/regenerate', authorizeRoles('ADMIN', 'VOLUNTEER', 'VETERINARIAN'), regenerateQR);
router.get('/:id/qr/download', downloadQR);

// Gallery
router.get('/:id/gallery', getGallery);
router.post('/:id/gallery', authorizeRoles('ADMIN', 'VOLUNTEER'), uploadGalleryPhotos.array('images', 10), addGalleryImages);
router.delete('/:id/gallery/:imageId', authorizeRoles('ADMIN', 'VOLUNTEER'), deleteGalleryImage);

// Clinical
router.get('/:id/medical-summary', authorizeRoles('ADMIN', 'VETERINARIAN', 'VOLUNTEER'), getMedicalSummary);
router.get('/:id/clinical-record', authorizeRoles('ADMIN', 'VETERINARIAN'), getClinicalRecord);
router.post('/:id/clinical-record/entries', authorizeRoles('ADMIN', 'VETERINARIAN'), createClinicalEntry);

// Vaccines
router.get('/:id/vaccines', authorizeRoles('ADMIN', 'VETERINARIAN', 'VOLUNTEER'), getAnimalVaccines);
router.post('/:id/vaccines', authorizeRoles('ADMIN', 'VETERINARIAN'), createVaccine);

export default router;
