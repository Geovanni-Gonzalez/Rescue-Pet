import { Router } from 'express';
import { getUsers, getUserById, updateUser } from '../controllers/userController';
import { authenticateToken, authorizeRoles } from '../middlewares/authMiddleware';

const router = Router();

// Todas las rutas de usuarios requieren autenticación
router.use(authenticateToken);

// Solo ADMIN puede obtener todos los usuarios
router.get('/', authorizeRoles('ADMIN'), getUsers);

// ADMIN o el propio usuario pueden ver sus datos (la lógica de "propio usuario" está en el controlador)
router.get('/:id', authorizeRoles('ADMIN', 'VETERINARIAN', 'VOLUNTEER', 'ADOPTER'), getUserById);

// ADMIN o el propio usuario pueden actualizar sus datos
router.patch('/:id', authorizeRoles('ADMIN', 'VETERINARIAN', 'VOLUNTEER', 'ADOPTER'), updateUser);

export default router;
