import { Router } from 'express';
import { adminMiddleware } from '../middleware/admin.js';
import { fetchVideosHandler, seedStatusHandler, fillCatalogHandler } from '../controllers/admin.controller.js';

const router = Router();

router.post('/fetch-videos', adminMiddleware, fetchVideosHandler);
router.post('/fill-catalog', adminMiddleware, fillCatalogHandler);
router.get('/seed-status', adminMiddleware, seedStatusHandler);

export default router;
