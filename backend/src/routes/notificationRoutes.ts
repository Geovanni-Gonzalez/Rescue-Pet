import { Router } from 'express';
import { getNotifications, getUnreadCount, markAsRead, markAllAsRead, deleteNotification } from '../controllers/notificationController';
import { authenticateToken } from '../middlewares/authMiddleware';

const router = Router();
router.use(authenticateToken);

router.get('/', getNotifications);
router.get('/unread-count', getUnreadCount);
router.patch('/:id/read', markAsRead);
router.post('/read-all', markAllAsRead);
router.delete('/:id', deleteNotification);

export default router;
