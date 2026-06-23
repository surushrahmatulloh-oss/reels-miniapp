import { Router } from 'express';
import {
  likeVideo,
  unlikeVideo,
  saveVideo,
  unsaveVideo,
  shareVideo,
  getComments,
  addComment,
  likeComment,
  getSavedVideos,
  getLikedVideos,
} from '../controllers/video.controller.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

router.use(authMiddleware);

router.get('/saved/list', getSavedVideos);
router.get('/liked/list', getLikedVideos);
router.post('/:id/like', likeVideo);
router.delete('/:id/like', unlikeVideo);
router.post('/:id/save', saveVideo);
router.delete('/:id/save', unsaveVideo);
router.post('/:id/share', shareVideo);
router.get('/:id/comments', getComments);
router.post('/:id/comments', addComment);
router.post('/:id/comments/:commentId/like', likeComment);
router.post('/view/:id', (_req, res) => res.json({ ok: true }));

export default router;
