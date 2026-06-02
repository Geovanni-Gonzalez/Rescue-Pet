import { Router } from 'express';
import { getAuditLogs, getAuditActions, getAuditEntityTypes } from '../controllers/auditController';
import { authenticateToken, authorizeRoles } from '../middlewares/authMiddleware';

const router = Router();
router.use(authenticateToken);
router.use(authorizeRoles('ADMIN'));

router.get('/', getAuditLogs);
router.get('/actions', getAuditActions);
router.get('/entity-types', getAuditEntityTypes);

export default router;
