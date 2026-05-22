import { Router } from 'express';
import { getPets, getPetById, createPet, updatePet, updatePetStatus, generatePetQR } from '../controllers/petController';
import { authenticateToken, authorizeRoles } from '../middlewares/authMiddleware';

const router = Router();

// Todas las rutas de mascotas requieren autenticación mínima
router.use(authenticateToken);

// Catálogo (con filtros según rol en el controller)
router.get('/', getPets);

// Ficha de mascota (con filtro según rol en el controller)
router.get('/:id', getPetById);

// ADMIN y VOLUNTEER pueden crear y editar datos básicos
router.post('/', authorizeRoles('ADMIN', 'VOLUNTEER'), createPet);
router.patch('/:id', authorizeRoles('ADMIN', 'VOLUNTEER'), updatePet);

// ADMIN y VETERINARIAN pueden cambiar estado de salud/adopción
router.patch('/:id/status', authorizeRoles('ADMIN', 'VETERINARIAN'), updatePetStatus);

// Generar QR de ficha pública
router.post('/:id/generate-qr', authorizeRoles('ADMIN', 'VOLUNTEER', 'VETERINARIAN'), generatePetQR);

export default router;
