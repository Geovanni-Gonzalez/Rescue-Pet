import { Router } from 'express';
import {
  getUsers,
  getUserById,
  createUser,
  updateMe,
  updateUserAdmin,
  changePassword,
  deactivateUser,
} from '../controllers/userController';
import { authenticateToken, authorizeRoles } from '../middlewares/authMiddleware';

const router = Router();

router.use(authenticateToken);

router.get('/', authorizeRoles('ADMIN'), getUsers);
router.post('/', authorizeRoles('ADMIN'), createUser);

// /me routes must come before /:id to avoid Express matching "me" as an id param
router.put('/me', updateMe);
router.put('/me/password', changePassword);

router.get('/:id', getUserById);
router.patch('/:id', authorizeRoles('ADMIN'), updateUserAdmin);
router.patch('/:id/deactivate', authorizeRoles('ADMIN'), deactivateUser);

export default router;
