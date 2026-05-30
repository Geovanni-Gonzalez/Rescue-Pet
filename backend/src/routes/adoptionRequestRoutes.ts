import { Router } from 'express';
import {
  createAdoptionRequest,
  getAdoptionRequests,
  getAdoptionRequestById,
  getMyAdoptionRequests,
  signAdoptionContract,
  updateAdoptionRequestStatus,
  uploadAdoptionDocument,
} from '../controllers/adoptionRequestController';
import { authenticateToken, authorizeRoles } from '../middlewares/authMiddleware';

const router = Router();

// Todas las rutas de solicitudes de adopción requieren autenticación
router.use(authenticateToken);

// Crear solicitud de adopción (solo ADOPTER)
router.post('/', authorizeRoles('ADOPTER'), createAdoptionRequest);

// Obtener todas las solicitudes (ADMIN ve todas, ADOPTER solo las suyas via /me)
router.get('/', getAdoptionRequests);

// Obtener solicitudes del usuario actual (ADOPTER)
router.get('/me', getMyAdoptionRequests);

// Obtener una solicitud específica
router.get('/:id', getAdoptionRequestById);

// Cambiar estado de solicitud (solo ADMIN)
router.patch('/:id/status', authorizeRoles('ADMIN'), updateAdoptionRequestStatus);

// Repositorio documental de la solicitud
router.post('/:id/documents', authorizeRoles('ADOPTER', 'ADMIN'), uploadAdoptionDocument);

// Firma del contrato por parte del adoptante
router.post('/:id/contract/sign', authorizeRoles('ADOPTER'), signAdoptionContract);

export default router;
