import { Router, Request, Response } from 'express';
import { authenticateToken, authorizeRoles } from '../middlewares/authMiddleware';

const router = Router();
router.use(authenticateToken);
router.use(authorizeRoles('ADMIN'));

// Role and permission management (CU-11)
// Permissions are currently managed via Role enum; this exposes metadata
router.get('/', (_req: Request, res: Response) => {
  res.json({
    success: true,
    roles: [
      { name: 'ADMIN', description: 'Administrador con acceso total' },
      { name: 'VETERINARIAN', description: 'Gestión clínica y veterinaria' },
      { name: 'VOLUNTEER', description: 'Registro de mascotas y tareas operativas' },
      { name: 'ADOPTER', description: 'Catálogo y proceso de adopción' },
    ],
  });
});

export default router;
