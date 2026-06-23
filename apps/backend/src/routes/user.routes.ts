import { Router } from 'express';
import {
  updatePreferences,
  completeOnboarding,
  getMe,
  getUserProfile,
  updateProfile,
  followUser,
  unfollowUser,
  getUserVideos,
  searchUsers,
  searchVideos,
} from '../controllers/user.controller.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

router.use(authMiddleware);

router.get('/me', getMe);
router.put('/preferences', updatePreferences);
router.post('/onboarding', completeOnboarding);
router.put('/profile', updateProfile);
router.get('/search', searchUsers);
router.get('/:username/profile', getUserProfile);
router.get('/:username/videos', getUserVideos);
router.post('/:id/follow', followUser);
router.delete('/:id/follow', unfollowUser);

export { searchVideos };
export default router;
