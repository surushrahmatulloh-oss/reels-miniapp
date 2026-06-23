import { Router } from 'express';
import { getFeed, markViewed } from '../controllers/feed.controller.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

router.use(authMiddleware);
router.get('/', getFeed);
router.post('/view/:id', markViewed);

export default router;
