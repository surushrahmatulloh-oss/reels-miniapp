import { Router } from 'express';
import { searchVideos } from '../controllers/user.controller.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

router.use(authMiddleware);
router.get('/videos', searchVideos);

export default router;
