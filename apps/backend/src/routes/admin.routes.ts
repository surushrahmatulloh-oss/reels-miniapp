import { Router } from 'express';
import { adminMiddleware } from '../middleware/admin.js';
import { fetchVideosHandler } from '../controllers/admin.controller.js';

const router = Router();

router.post('/fetch-videos', adminMiddleware, fetchVideosHandler);

export default router;
